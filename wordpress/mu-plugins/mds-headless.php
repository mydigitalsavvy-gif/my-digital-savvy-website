<?php
/**
 * Plugin Name: MDS Headless Bridge
 * Description: Connects WordPress to the Next.js frontend: path index and settings endpoints, on-save revalidation, and editor previews.
 * Version:     1.0.0
 *
 * STATUS: prepared, NOT installed. Installing requires approval (see docs/phase-5/README.md).
 *
 * Install: copy to wp-content/mu-plugins/mds-headless.php and add to wp-config.php:
 *
 *   define( 'MDS_FRONTEND_URL', 'https://mydigitalsavvy.com' );        // Next.js origin, no trailing slash
 *   define( 'MDS_REVALIDATE_SECRET', '<long random string>' );          // = MDS_REVALIDATE_SECRET in Next.js
 *   define( 'MDS_PREVIEW_SECRET', '<different long random string>' );   // = MDS_PREVIEW_SECRET in Next.js
 *
 * Every feature is inert until its constants are defined, so dropping the
 * file in changes nothing on its own. It never alters content, URLs,
 * Yoast data or the existing theme output.
 */

defined( 'ABSPATH' ) || exit;

/** Structured post types (registered by mds-content-model.php). Must match the frontend REST_BASE map. */
const MDS_STRUCTURED_TYPES = array( 'service', 'location_page', 'case_study', 'industry', 'portfolio_project' );

/* ─────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

function mds_path_from_url( $url ) {
	$path = wp_parse_url( $url, PHP_URL_PATH );
	return trailingslashit( $path ? $path : '/' );
}

function mds_field( $name, $post_id ) {
	return function_exists( 'get_field' ) ? get_field( $name, $post_id ) : get_post_meta( $post_id, $name, true );
}

/** Public URL path: the public_path field when set, else the permalink. */
function mds_public_path( WP_Post $post ) {
	$custom = mds_field( 'public_path', $post->ID );
	if ( is_string( $custom ) && '' !== trim( $custom ) ) {
		return trailingslashit( '/' . ltrim( trim( $custom ), '/' ) );
	}
	return mds_path_from_url( get_permalink( $post ) );
}

/** previous_paths repeater (rows with a "path" sub-field) or a newline list. */
function mds_previous_paths( WP_Post $post ) {
	$raw   = mds_field( 'previous_paths', $post->ID );
	$paths = array();
	if ( is_array( $raw ) ) {
		foreach ( $raw as $row ) {
			if ( ! empty( $row['path'] ) ) {
				$paths[] = $row['path'];
			}
		}
	} elseif ( is_string( $raw ) ) {
		$paths = preg_split( '/[\r\n,]+/', $raw );
	}
	$out = array();
	foreach ( $paths as $p ) {
		$p = trim( (string) $p );
		if ( '' !== $p ) {
			$out[] = trailingslashit( '/' . ltrim( mds_path_from_url( $p ), '/' ) );
		}
	}
	return array_values( array_unique( $out ) );
}

function mds_is_noindex( WP_Post $post ) {
	return '1' === (string) get_post_meta( $post->ID, '_yoast_wpseo_meta-robots-noindex', true );
}

function mds_is_configured( $secret_constant ) {
	return defined( 'MDS_FRONTEND_URL' ) && defined( $secret_constant ) && '' !== constant( $secret_constant );
}

/* ─────────────────────────────────────────────────────────────────────
 * REST: mds/v1/paths and mds/v1/settings
 * ──────────────────────────────────────────────────────────────────── */

add_action( 'rest_api_init', function () {
	register_rest_route( 'mds/v1', '/paths', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true', // public data only: published URLs and titles
		'callback'            => 'mds_rest_paths',
	) );
	register_rest_route( 'mds/v1', '/settings', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true', // public contact details only
		'callback'            => 'mds_rest_settings',
	) );
} );

/** Every published URL the frontend should resolve, plus its previous paths. */
function mds_rest_paths() {
	$types = array_merge( array( 'page', 'post' ), array_values( array_filter( MDS_STRUCTURED_TYPES, 'post_type_exists' ) ) );
	$posts = get_posts( array(
		'post_type'        => $types,
		'post_status'      => 'publish',
		'numberposts'      => -1,
		'orderby'          => 'ID',
		'order'            => 'ASC',
		'suppress_filters' => false,
	) );

	$front_id = 'page' === get_option( 'show_on_front' ) ? (int) get_option( 'page_on_front' ) : 0;
	$blog_id  = (int) get_option( 'page_for_posts' );
	$items    = array();

	foreach ( $posts as $post ) {
		$previous = mds_previous_paths( $post );
		if ( $post->ID === $front_id ) {
			$previous[] = '/' . $post->post_name . '/'; // WordPress 301s the front page slug to "/"
		}
		$item = array(
			'path'           => $post->ID === $front_id ? '/' : mds_public_path( $post ),
			'type'           => $post->post_type,
			'id'             => $post->ID,
			'slug'           => $post->post_name,
			'title'          => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
			'modified'       => get_post_modified_time( 'c', true, $post ),
			'previous_paths' => array_values( array_unique( $previous ) ),
			'noindex'        => mds_is_noindex( $post ),
		);
		if ( $post->ID === $front_id ) {
			$item['kind'] = 'front-page';
		} elseif ( $post->ID === $blog_id ) {
			$item['kind'] = 'blog-index';
		}
		$catalogue = mds_field( 'catalogue_slug', $post->ID );
		if ( is_string( $catalogue ) && '' !== $catalogue ) {
			$item['catalogue_slug'] = $catalogue;
		}
		$items[] = $item;
	}

	$response = rest_ensure_response( array(
		'generated'       => gmdate( 'c' ),
		'posts_per_page'  => (int) get_option( 'posts_per_page', 10 ),
		'blog_index_path' => $blog_id ? mds_path_from_url( get_permalink( $blog_id ) ) : null,
		'front_page_id'   => $front_id,
		'items'           => $items,
	) );
	$response->header( 'Cache-Control', 'public, max-age=300' );
	return $response;
}

/** Site Settings options page (mds-content-model.php). 404 until it exists, so the frontend keeps its static values. */
function mds_rest_settings() {
	if ( ! function_exists( 'get_field' ) ) {
		return new WP_Error( 'mds_no_settings', 'Site settings are not configured.', array( 'status' => 404 ) );
	}
	$offices = array();
	foreach ( (array) get_field( 'offices', 'option' ) as $row ) {
		if ( ! empty( $row['label'] ) && ! empty( $row['address'] ) ) {
			$offices[] = array( 'label' => $row['label'], 'address' => $row['address'] );
		}
	}
	$social = array();
	foreach ( (array) get_field( 'social_links', 'option' ) as $row ) {
		if ( ! empty( $row['label'] ) && ! empty( $row['url'] ) ) {
			$social[] = array( 'label' => $row['label'], 'url' => esc_url_raw( $row['url'] ) );
		}
	}
	return rest_ensure_response( array(
		'phone'             => (string) get_field( 'phone', 'option' ),
		'whatsapp_number'   => (string) get_field( 'whatsapp_number', 'option' ),
		'email'             => (string) get_field( 'email', 'option' ),
		'offices'           => $offices,
		'social_links'      => $social,
		'gtm_id'            => (string) get_field( 'gtm_id', 'option' ),
		'meta_pixel_id'     => (string) get_field( 'meta_pixel_id', 'option' ),
		'google_review_url' => esc_url_raw( (string) get_field( 'google_review_url', 'option' ) ),
	) );
}

/* ─────────────────────────────────────────────────────────────────────
 * On-save revalidation → Next.js /api/revalidate/
 * ──────────────────────────────────────────────────────────────────── */

/** Changes collected during this request, sent once at shutdown. */
$GLOBALS['mds_revalidate_queue'] = array();

function mds_queue_revalidate( array $payload ) {
	$key = $payload['type'] . ':' . ( isset( $payload['id'] ) ? $payload['id'] : '' );
	$GLOBALS['mds_revalidate_queue'][ $key ] = $payload;
}

/** Remember the URL before an update, so a slug change also refreshes the old path. */
add_action( 'pre_post_update', function ( $post_id ) {
	$post = get_post( $post_id );
	if ( $post && 'publish' === $post->post_status ) {
		$GLOBALS['mds_old_paths'][ $post_id ] = mds_public_path( $post );
	}
} );

add_action( 'transition_post_status', function ( $new_status, $old_status, $post ) {
	if ( ! mds_is_configured( 'MDS_REVALIDATE_SECRET' ) ) {
		return;
	}
	if ( wp_is_post_revision( $post ) || wp_is_post_autosave( $post ) ) {
		return;
	}
	if ( 'publish' !== $new_status && 'publish' !== $old_status ) {
		return; // drafts don't affect the public site
	}
	if ( ! in_array( $post->post_type, array_merge( array( 'page', 'post', 'testimonial' ), MDS_STRUCTURED_TYPES ), true ) ) {
		return;
	}
	$previous = mds_previous_paths( $post );
	if ( ! empty( $GLOBALS['mds_old_paths'][ $post->ID ] ) ) {
		$previous[] = $GLOBALS['mds_old_paths'][ $post->ID ];
	}
	mds_queue_revalidate( array(
		'type'           => $post->post_type,
		'id'             => $post->ID,
		'slug'           => $post->post_name,
		'path'           => mds_public_path( $post ),
		'previous_paths' => array_values( array_unique( $previous ) ),
	) );
}, 10, 3 );

add_action( 'edited_term', function ( $term_id, $tt_id, $taxonomy ) {
	if ( in_array( $taxonomy, array( 'category', 'post_tag' ), true ) && mds_is_configured( 'MDS_REVALIDATE_SECRET' ) ) {
		$term = get_term( $term_id, $taxonomy );
		mds_queue_revalidate( array(
			'type' => $taxonomy,
			'id'   => $term_id,
			'slug' => $term ? $term->slug : null,
			'path' => $term ? mds_path_from_url( get_term_link( $term ) ) : null,
		) );
	}
}, 10, 3 );

/** Site Settings options page saved (SCF/ACF hook). */
add_action( 'acf/save_post', function ( $post_id ) {
	if ( 'options' === $post_id && mds_is_configured( 'MDS_REVALIDATE_SECRET' ) ) {
		mds_queue_revalidate( array( 'type' => 'settings' ) );
	}
}, 20 );

add_action( 'shutdown', function () {
	if ( empty( $GLOBALS['mds_revalidate_queue'] ) ) {
		return;
	}
	foreach ( $GLOBALS['mds_revalidate_queue'] as $payload ) {
		wp_remote_post( MDS_FRONTEND_URL . '/api/revalidate/', array(
			'headers'  => array(
				'Content-Type' => 'application/json',
				'x-mds-secret' => MDS_REVALIDATE_SECRET,
			),
			'body'     => wp_json_encode( $payload ),
			'timeout'  => 5,
			'blocking' => false, // never slow down the editor's save
		) );
	}
	$GLOBALS['mds_revalidate_queue'] = array();
} );

/* ─────────────────────────────────────────────────────────────────────
 * Preview → Next.js Draft Mode
 * ──────────────────────────────────────────────────────────────────── */

/**
 * The editor's Preview button opens /api/draft/ on the frontend, which
 * checks the secret, enables Draft Mode and redirects to the page. The
 * secret is only visible to logged-in editors in wp-admin.
 */
add_filter( 'preview_post_link', function ( $link, $post ) {
	if ( ! mds_is_configured( 'MDS_PREVIEW_SECRET' ) ) {
		return $link;
	}
	return MDS_FRONTEND_URL . '/api/draft/?' . http_build_query( array(
		'secret' => MDS_PREVIEW_SECRET,
		'type'   => $post->post_type,
		'id'     => $post->ID,
	) );
}, 10, 2 );
