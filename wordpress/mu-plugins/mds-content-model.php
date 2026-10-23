<?php
/**
 * Plugin Name: MDS Content Model
 * Description: Structured post types, fields and the Site Settings page that the Next.js frontend reads.
 * Version:     1.0.0
 *
 * STATUS: prepared, NOT installed. Phase 6 work; installing requires approval.
 * Requires Secure Custom Fields (free, wordpress.org) or ACF Pro for the
 * field groups and options page. Post types register without it.
 *
 * This file is the contract with frontend/lib/wordpress/types.ts:
 * post type keys, rest_base values and field names must match exactly.
 * It creates EMPTY post types; it moves, deletes or changes no existing
 * page, post, URL or Yoast setting.
 */

defined( 'ABSPATH' ) || exit;

/* ─────────────────────────────────────────────────────────────────────
 * Post types
 * ──────────────────────────────────────────────────────────────────── */

add_action( 'init', function () {
	$common = array(
		'public'       => true,
		'show_in_rest' => true,                // required: the frontend reads REST
		'has_archive'  => false,               // listings are rendered by Next.js
		'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'page-attributes', 'custom-fields' ),
		'menu_position'=> 21,
	);
	$types = array(
		// key               rest_base          rewrite slug     singular / plural
		'service'           => array( 'services',       'services',     'Service',       'Services',       'dashicons-megaphone' ),
		'location_page'     => array( 'location-pages', 'locations',    'Location page', 'Location pages', 'dashicons-location' ),
		'case_study'        => array( 'case-studies',   'case-studies', 'Case study',    'Case studies',   'dashicons-chart-line' ),
		'industry'          => array( 'industries',     'industries',   'Industry',      'Industries',     'dashicons-building' ),
		'portfolio_project' => array( 'portfolio',      'portfolio',    'Portfolio project', 'Portfolio',  'dashicons-portfolio' ),
	);
	foreach ( $types as $key => list( $rest_base, $slug, $singular, $plural, $icon ) ) {
		register_post_type( $key, array_merge( $common, array(
			'rest_base' => $rest_base,
			'rewrite'   => array( 'slug' => $slug, 'with_front' => false ),
			'menu_icon' => $icon,
			'labels'    => array( 'name' => $plural, 'singular_name' => $singular, 'add_new_item' => "Add {$singular}", 'edit_item' => "Edit {$singular}" ),
		) ) );
	}
	// Testimonials have no public URL of their own.
	register_post_type( 'testimonial', array(
		'public'             => false,
		'show_ui'            => true,
		'show_in_rest'       => true,
		'publicly_queryable' => false,
		'rest_base'          => 'testimonials',
		'supports'           => array( 'title', 'revisions', 'page-attributes' ),
		'menu_icon'          => 'dashicons-format-quote',
		'labels'             => array( 'name' => 'Testimonials', 'singular_name' => 'Testimonial' ),
	) );
} );

/* ─────────────────────────────────────────────────────────────────────
 * Fields (Secure Custom Fields / ACF local field groups)
 * ──────────────────────────────────────────────────────────────────── */

add_action( 'acf/init', function () {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	$f = function ( $name, $type, $extra = array() ) {
		return array_merge( array( 'key' => "field_mds_{$name}", 'name' => $name, 'label' => ucwords( str_replace( '_', ' ', $name ) ), 'type' => $type ), $extra );
	};
	$sub = function ( $parent, $name, $type, $extra = array() ) {
		return array_merge( array( 'key' => "field_mds_{$parent}_{$name}", 'name' => $name, 'label' => ucwords( str_replace( '_', ' ', $name ) ), 'type' => $type ), $extra );
	};
	$rel = function ( $name, $post_type, $extra = array() ) use ( $f ) {
		return $f( $name, 'relationship', array_merge( array( 'post_type' => array( $post_type ), 'return_format' => 'id' ), $extra ) );
	};
	$path_fields = function ( $prefix ) use ( $f, $sub ) {
		return array(
			$f( "{$prefix}_public_path", 'text', array( 'name' => 'public_path', 'label' => 'Public path', 'instructions' => 'The live URL, e.g. /seo-agency-in-nagpur/. Leave empty to use the permalink. Changing it moves the page: add the old URL to Previous paths.' ) ),
			$f( "{$prefix}_previous_paths", 'repeater', array( 'name' => 'previous_paths', 'label' => 'Previous paths (301 to this page)', 'sub_fields' => array( $sub( "{$prefix}_prev", 'path', 'text' ) ) ) ),
		);
	};
	$faqs = function ( $prefix ) use ( $f, $sub ) {
		return $f( "{$prefix}_faqs", 'repeater', array( 'name' => 'faqs', 'label' => 'FAQs', 'sub_fields' => array( $sub( "{$prefix}_faq", 'question', 'text' ), $sub( "{$prefix}_faq", 'answer', 'wysiwyg' ) ) ) );
	};
	$group = function ( $key, $title, $post_type, $fields ) {
		acf_add_local_field_group( array(
			'key'          => "group_mds_{$key}",
			'title'        => $title,
			'fields'       => $fields,
			'location'     => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => $post_type ) ) ),
			'show_in_rest' => 1, // exposes fields under "acf" in REST
		) );
	};

	$group( 'service', 'Service', 'service', array_merge( $path_fields( 'service' ), array(
		$f( 'catalogue_slug', 'select', array( 'label' => 'Homepage service panel', 'choices' => array( '' => '— none —', 'social-media-marketing' => '01 Social Media Marketing', 'social-media-management' => '02 Social Media Management', 'search-engine-optimization' => '03 SEO', 'search-engine-marketing' => '04 SEM', 'graphic-designing' => '05 Graphic Designing', 'video-editing' => '06 Video Editing', 'youtube-management' => '07 YouTube Management', 'website-development' => '08 Website Development', 'local-seo-gmb-optimization' => '09 Local SEO & GMB' ) ) ),
		$f( 'hero', 'group', array( 'sub_fields' => array( $sub( 'hero', 'headline', 'text', array( 'instructions' => 'Becomes the page H1. Keep the ranking keyword.' ) ), $sub( 'hero', 'intro', 'textarea' ), $sub( 'hero', 'image', 'image', array( 'return_format' => 'array' ) ) ) ) ),
		$f( 'short_description', 'textarea', array( 'instructions' => 'Also replaces this service\'s lede on the homepage panel.' ) ),
		$f( 'long_description', 'wysiwyg' ),
		$f( 'benefits', 'repeater', array( 'sub_fields' => array( $sub( 'benefits', 'title', 'text' ), $sub( 'benefits', 'body', 'textarea' ), $sub( 'benefits', 'image', 'image', array( 'return_format' => 'array' ) ) ) ) ),
		$f( 'process', 'repeater', array( 'sub_fields' => array( $sub( 'process', 'title', 'text' ), $sub( 'process', 'body', 'wysiwyg' ) ) ) ),
		$faqs( 'service' ),
		$rel( 'related_case_studies', 'case_study' ),
		$rel( 'industries', 'industry' ),
		$f( 'cta', 'group', array( 'sub_fields' => array( $sub( 'cta', 'label', 'text' ), $sub( 'cta', 'url', 'text', array( 'default_value' => '#contact' ) ) ) ) ),
	) ) );

	$group( 'location', 'Location page', 'location_page', array_merge( $path_fields( 'location' ), array(
		$f( 'city', 'text' ),
		$f( 'intro', 'textarea' ),
		$rel( 'services_offered', 'service' ),
		$f( 'local_proof', 'wysiwyg' ),
		$faqs( 'location' ),
	) ) );

	$group( 'case_study', 'Case study', 'case_study', array_merge( $path_fields( 'case_study' ), array(
		$f( 'client_name', 'text' ),
		$rel( 'industry', 'industry', array( 'max' => 1 ) ),
		$f( 'challenge', 'wysiwyg' ),
		$f( 'strategy', 'wysiwyg' ),
		$f( 'execution', 'wysiwyg' ),
		$f( 'results', 'wysiwyg' ),
		$f( 'metrics', 'repeater', array(
			'instructions' => 'A metric without a Source is never shown on the site.',
			'sub_fields'   => array( $sub( 'metrics', 'label', 'text' ), $sub( 'metrics', 'value', 'text' ), $sub( 'metrics', 'period', 'text' ), $sub( 'metrics', 'source', 'text', array( 'required' => 1 ) ) ),
		) ),
		$f( 'gallery', 'gallery', array( 'return_format' => 'array' ) ),
		$rel( 'testimonial', 'testimonial', array( 'max' => 1 ) ),
		$rel( 'services', 'service' ),
	) ) );

	$group( 'testimonial', 'Testimonial', 'testimonial', array(
		$f( 'name', 'text', array( 'required' => 1 ) ),
		$f( 'company', 'text' ),
		$f( 'designation', 'text' ),
		$f( 'photo', 'image', array( 'return_format' => 'array' ) ),
		$f( 'review', 'textarea', array( 'required' => 1, 'instructions' => 'Paste the real review text only.' ) ),
		$f( 'rating', 'number', array( 'min' => 1, 'max' => 5 ) ),
		$f( 'source', 'text', array( 'default_value' => 'Google review' ) ),
		$f( 'source_url', 'url', array( 'instructions' => 'Link to the original review.' ) ),
	) );

	$group( 'portfolio', 'Portfolio project', 'portfolio_project', array_merge( $path_fields( 'portfolio' ), array(
		$f( 'project_name', 'text' ),
		$f( 'category', 'text' ),
		$f( 'gallery', 'gallery', array( 'key' => 'field_mds_portfolio_gallery', 'return_format' => 'array' ) ),
		$f( 'technologies', 'text', array( 'instructions' => 'Comma separated.' ) ),
		$f( 'description', 'wysiwyg' ),
		$f( 'live_url', 'url' ),
	) ) );

	$group( 'industry', 'Industry', 'industry', array_merge( $path_fields( 'industry' ), array(
		$f( 'intro', 'wysiwyg', array( 'key' => 'field_mds_industry_intro' ) ),
		$f( 'pain_points', 'repeater', array( 'sub_fields' => array( $sub( 'pain', 'title', 'text' ), $sub( 'pain', 'body', 'textarea' ) ) ) ),
		$rel( 'services', 'service', array( 'key' => 'field_mds_industry_services' ) ),
		$rel( 'case_studies', 'case_study' ),
	) ) );

	/* Site Settings (options page) — read by mds/v1/settings */
	if ( function_exists( 'acf_add_options_page' ) ) {
		acf_add_options_page( array( 'page_title' => 'Site Settings', 'menu_slug' => 'mds-site-settings', 'capability' => 'manage_options', 'icon_url' => 'dashicons-admin-generic' ) );
	}
	acf_add_local_field_group( array(
		'key'      => 'group_mds_settings',
		'title'    => 'Site Settings',
		'fields'   => array(
			$f( 'phone', 'text' ),
			$f( 'whatsapp_number', 'text', array( 'instructions' => 'Digits with country code, e.g. 918149105083' ) ),
			$f( 'email', 'email' ),
			$f( 'offices', 'repeater', array( 'sub_fields' => array( $sub( 'offices', 'label', 'text' ), $sub( 'offices', 'address', 'textarea' ) ) ) ),
			$f( 'social_links', 'repeater', array( 'sub_fields' => array( $sub( 'social', 'label', 'text' ), $sub( 'social', 'url', 'url' ) ) ) ),
			$f( 'gtm_id', 'text' ),
			$f( 'meta_pixel_id', 'text' ),
			$f( 'google_review_url', 'url', array( 'instructions' => 'Replaces the placeholder review link on the homepage.' ) ),
		),
		'location' => array( array( array( 'param' => 'options_page', 'operator' => '==', 'value' => 'mds-site-settings' ) ) ),
	) );
} );

/* ─────────────────────────────────────────────────────────────────────
 * URL + SEO continuity for migrated content
 * ──────────────────────────────────────────────────────────────────── */

/**
 * When a structured post sets public_path (e.g. /seo-agency-in-nagpur/),
 * WordPress's own permalink becomes that path, so Yoast's canonical,
 * og:url and sitemap entry match the URL the page already ranks under.
 * The Elementor page at that URL keeps serving the WordPress frontend
 * until cutover (rollback path).
 */
add_filter( 'post_type_link', function ( $link, $post ) {
	if ( ! in_array( $post->post_type, array( 'service', 'location_page', 'case_study', 'industry', 'portfolio_project' ), true ) ) {
		return $link;
	}
	$path = function_exists( 'get_field' ) ? get_field( 'public_path', $post->ID ) : get_post_meta( $post->ID, 'public_path', true );
	if ( is_string( $path ) && '' !== trim( $path ) ) {
		return home_url( trailingslashit( '/' . ltrim( trim( $path ), '/' ) ) );
	}
	return $link;
}, 10, 2 );

/**
 * Lets the migration importer copy a page's exact Yoast values onto its
 * structured replacement over REST. Writable only by users who can edit
 * that post (the Editor-role importer); readable only in the edit context.
 */
add_action( 'init', function () {
	$keys = array(
		'_yoast_wpseo_title',
		'_yoast_wpseo_metadesc',
		'_yoast_wpseo_focuskw',
		'_yoast_wpseo_opengraph-title',
		'_yoast_wpseo_opengraph-description',
		'_yoast_wpseo_opengraph-image',
		'_yoast_wpseo_meta-robots-noindex',
		'mds_source_page_id', // migration provenance: the Elementor page this draft came from
	);
	foreach ( array( 'service', 'location_page', 'case_study', 'industry', 'portfolio_project' ) as $type ) {
		foreach ( $keys as $key ) {
			register_post_meta( $type, $key, array(
				'type'          => 'string',
				'single'        => true,
				'show_in_rest'  => true,
				'auth_callback' => function ( $allowed, $meta_key, $post_id ) {
					return current_user_can( 'edit_post', $post_id );
				},
			) );
		}
	}
}, 20 );
