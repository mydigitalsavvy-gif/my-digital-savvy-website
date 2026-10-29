<?php
/**
 * REST contract with the Next.js frontend (frontend/lib/careers/wp-client.ts).
 *
 *   GET  mds-careers/v1/jobs          public, published+closed jobs only
 *   GET  mds-careers/v1/settings      public, opportunity-category copy only
 *   POST mds-careers/v1/applications  requires X-MDS-Careers-Secret header
 *   POST mds-careers/v1/partnership   requires X-MDS-Careers-Secret header
 *
 * Deliberately its own namespace, not wp/v2 — draft/archived jobs and every
 * application/partnership row are structurally unreachable through any
 * public core REST query; this is the only code that can expose them, and
 * it only ever exposes what's explicitly built below. Everything received
 * here is re-validated — the Next.js layer already validated once, but
 * that's a convenience for the candidate, not a trust boundary.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_REST_Routes {
	const NS = 'mds-careers/v1';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		register_rest_route( self::NS, '/jobs', array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => array( $this, 'get_jobs' ),
		) );
		register_rest_route( self::NS, '/settings', array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => array( $this, 'get_settings' ),
		) );
		register_rest_route( self::NS, '/applications', array(
			'methods'             => 'POST',
			'permission_callback' => array( $this, 'check_secret' ),
			'callback'            => array( $this, 'post_application' ),
		) );
		register_rest_route( self::NS, '/partnership', array(
			'methods'             => 'POST',
			'permission_callback' => array( $this, 'check_secret' ),
			'callback'            => array( $this, 'post_partnership' ),
		) );
	}

	public function check_secret( WP_REST_Request $request ) {
		$provided = $request->get_header( 'x-mds-careers-secret' );
		$expected = MDS_Careers_Settings::get( 'shared_secret' );
		if ( ! $expected || ! $provided || ! hash_equals( (string) $expected, (string) $provided ) ) {
			return new WP_Error( 'mds_unauthorized', 'Invalid or missing secret.', array( 'status' => 401 ) );
		}
		return true;
	}

	/* ── GET /jobs ────────────────────────────────────────────────── */

	public function get_jobs( WP_REST_Request $request ) {
		$query = new WP_Query( array(
			'post_type'      => MDS_Careers_Jobs_CPT::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => 200,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'meta_query'     => array(
				array(
					'key'     => '_mds_status',
					'value'   => array( 'published', 'closed' ),
					'compare' => 'IN',
				),
			),
		) );
		$jobs = array_map( array( 'MDS_Careers_Jobs_CPT', 'to_array' ), $query->posts );
		return rest_ensure_response( $jobs );
	}

	public function get_settings( WP_REST_Request $request ) {
		return rest_ensure_response( array(
			'categories' => MDS_Careers_Settings::get_categories(),
		) );
	}

	/* ── POST /applications ──────────────────────────────────────── */

	public function post_application( WP_REST_Request $request ) {
		$get = fn( $key ) => trim( (string) $request->get_param( $key ) );

		$job_id = (int) $get( 'jobId' );
		$job    = $job_id ? get_post( $job_id ) : null;
		$errors = array();

		if ( ! $job || MDS_Careers_Jobs_CPT::POST_TYPE !== $job->post_type ) {
			return new WP_Error( 'mds_job_not_found', 'That job could not be found.', array( 'status' => 404 ) );
		}
		if ( 'published' !== get_post_meta( $job_id, '_mds_status', true ) ) {
			return new WP_Error( 'mds_job_closed', 'This position is no longer accepting applications.', array( 'status' => 409 ) );
		}

		$full_name = $get( 'fullName' );
		if ( mb_strlen( $full_name ) < 2 ) {
			$errors['fullName'] = 'Full name is required';
		}
		$email = $get( 'email' );
		if ( ! preg_match( '/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email ) ) {
			$errors['email'] = 'Enter a valid email address';
		}
		$phone = $get( 'phone' );
		if ( ! preg_match( '/^[+\d][\d\s-]{6,}$/', $phone ) ) {
			$errors['phone'] = 'Enter a valid phone number';
		}
		$employment_type = $get( 'employmentType' );
		if ( ! array_key_exists( $employment_type, MDS_Careers_Jobs_CPT::EMPLOYMENT_TYPES ) ) {
			$errors['employmentType'] = 'Select a valid employment type';
		}
		if ( 'true' !== $get( 'consent' ) ) {
			$errors['consent'] = 'Consent is required';
		}
		$portfolio_url = $get( 'portfolioUrl' );
		if ( '' !== $portfolio_url && ! preg_match( '#^https?://#i', $portfolio_url ) ) {
			$errors['portfolioUrl'] = 'Enter a valid URL';
		}

		$files = $request->get_file_params();
		$resume = null;
		if ( empty( $errors ) ) {
			if ( empty( $files['resume'] ) ) {
				$errors['resume'] = 'Attach your résumé/CV to continue';
			} else {
				$resume = MDS_Careers_Resume_Storage::store( $files['resume'] );
				if ( is_wp_error( $resume ) ) {
					$errors['resume'] = $resume->get_error_message();
				}
			}
		}

		if ( ! empty( $errors ) ) {
			return new WP_Error( 'mds_validation', 'Please check the highlighted fields.', array( 'status' => 400, 'errors' => $errors ) );
		}

		$id = MDS_Careers_Applications::insert( array(
			'job_id'               => $job_id,
			'job_title'            => get_the_title( $job ),
			'full_name'            => sanitize_text_field( $full_name ),
			'email'                => sanitize_email( $email ),
			'phone'                => sanitize_text_field( $phone ),
			'employment_type'      => $employment_type,
			'experience'           => sanitize_text_field( $get( 'experience' ) ),
			'skills'               => sanitize_textarea_field( $get( 'skills' ) ),
			'portfolio_url'        => esc_url_raw( $portfolio_url ),
			'resume_path'          => $resume['path'],
			'resume_original_name' => $resume['original_name'],
			'cover_letter'         => sanitize_textarea_field( $get( 'coverLetter' ) ),
			'consent'              => true,
			'source'               => sanitize_text_field( $get( 'source' ) ?: 'website' ),
		) );

		if ( is_wp_error( $id ) ) {
			return new WP_Error( 'mds_save_failed', $id->get_error_message(), array( 'status' => 500 ) );
		}

		$app = MDS_Careers_Applications::get( $id );
		// Independent: one failing never affects the other or the already-stored application.
		MDS_Careers_Notifications::send_application_email( $app );
		MDS_Careers_Notifications::send_application_whatsapp( $app );

		return rest_ensure_response( array(
			'applicationId' => (string) $id,
			'jobTitle'      => get_the_title( $job ),
		) );
	}

	/* ── POST /partnership ───────────────────────────────────────── */

	public function post_partnership( WP_REST_Request $request ) {
		$get    = fn( $key ) => trim( (string) $request->get_param( $key ) );
		$errors = array();

		$agency_name = $get( 'agencyName' );
		if ( mb_strlen( $agency_name ) < 2 ) {
			$errors['agencyName'] = 'Agency name is required';
		}
		$contact_name = $get( 'contactName' );
		if ( mb_strlen( $contact_name ) < 2 ) {
			$errors['contactName'] = 'Contact name is required';
		}
		$work_email = $get( 'workEmail' );
		if ( ! preg_match( '/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $work_email ) ) {
			$errors['workEmail'] = 'Enter a valid email address';
		}
		$phone = $get( 'phone' );
		if ( ! preg_match( '/^[+\d][\d\s-]{6,}$/', $phone ) ) {
			$errors['phone'] = 'Enter a valid phone number';
		}
		$services_required = $get( 'servicesRequired' );
		if ( mb_strlen( $services_required ) < 2 ) {
			$errors['servicesRequired'] = 'Tell us what services you need';
		}
		if ( 'true' !== $get( 'consent' ) ) {
			$errors['consent'] = 'Consent is required';
		}

		if ( ! empty( $errors ) ) {
			return new WP_Error( 'mds_validation', 'Please check the highlighted fields.', array( 'status' => 400, 'errors' => $errors ) );
		}

		$id = MDS_Careers_Partnerships::insert( array(
			'agency_name'       => sanitize_text_field( $agency_name ),
			'contact_name'      => sanitize_text_field( $contact_name ),
			'work_email'        => sanitize_email( $work_email ),
			'phone'             => sanitize_text_field( $phone ),
			'services_required' => sanitize_textarea_field( $services_required ),
			'estimated_volume'  => sanitize_text_field( $get( 'estimatedVolume' ) ),
			'message'           => sanitize_textarea_field( $get( 'message' ) ),
			'consent'           => true,
			'source'            => sanitize_text_field( $get( 'source' ) ?: 'website' ),
		) );

		if ( is_wp_error( $id ) ) {
			return new WP_Error( 'mds_save_failed', $id->get_error_message(), array( 'status' => 500 ) );
		}

		$enquiry = MDS_Careers_Partnerships::get( $id );
		MDS_Careers_Notifications::send_partnership_email( $enquiry );

		return rest_ensure_response( array( 'enquiryId' => (string) $id ) );
	}
}
