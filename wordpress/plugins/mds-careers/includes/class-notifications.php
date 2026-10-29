<?php
/**
 * Email (via whatever WP Mail SMTP / wp_mail() transport is already
 * configured on the site) and WhatsApp Cloud API notifications. Both are
 * attempted independently with their own try/catch-equivalent error
 * handling — a WhatsApp failure never discards or blocks the already-
 * stored application, and vice versa. Neither credential ever needs to
 * exist in the Next.js/Vercel environment: both live only here, server-
 * side in WordPress, configured via the Settings screen.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_Notifications {
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		// Hook only; all logic is reached via the static helpers below so
		// class-rest-routes.php and class-applications.php (retry button)
		// can call them directly without needing the singleton.
	}

	private static function recipients() {
		$to = array_filter( array(
			MDS_Careers_Settings::get( 'notification_email' ),
			MDS_Careers_Settings::get( 'hr_email' ),
		) );
		return array_values( array_unique( $to ) );
	}

	/** Captures the WP_Error from a failed wp_mail() call — wp_mail() itself only returns bool. */
	private static function send_mail( $to, $subject, $body ) {
		$error = null;
		$capture = function ( $wp_error ) use ( &$error ) {
			$error = $wp_error;
		};
		add_action( 'wp_mail_failed', $capture );
		$sent = wp_mail( $to, $subject, $body );
		remove_action( 'wp_mail_failed', $capture );
		if ( $sent ) {
			return true;
		}
		return $error instanceof WP_Error ? $error->get_error_message() : 'wp_mail() returned false';
	}

	/* ── applications ─────────────────────────────────────────────── */

	public static function send_application_email( array $app ) {
		$to = self::recipients();
		if ( ! $to ) {
			MDS_Careers_Applications::update_field( $app['id'], 'email_status', 'failed' );
			MDS_Careers_Applications::update_field( $app['id'], 'email_error', 'No HIRING_NOTIFICATION_EMAIL / HIRING_HR_EMAIL configured in Careers → Settings.' );
			return;
		}
		$admin_url = add_query_arg(
			array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-application', 'id' => $app['id'] ),
			admin_url( 'edit.php' )
		);
		$subject = sprintf( 'New application: %s — %s', $app['job_title_snapshot'], $app['full_name'] );
		$body    = implode( "\n", array(
			"A new application was submitted on the website.",
			"",
			"Candidate: {$app['full_name']}",
			"Job: {$app['job_title_snapshot']}",
			"Experience: " . ( $app['experience'] ?: '—' ),
			"Email: {$app['email']}",
			"Phone/WhatsApp: {$app['phone']}",
			"Skills: " . ( $app['skills'] ?: '—' ),
			"Portfolio: " . ( $app['portfolio_url'] ?: '—' ),
			"Application ID: #{$app['id']}",
			"",
			"Review in the admin area: {$admin_url}",
		) );
		$result = self::send_mail( $to, $subject, $body );
		if ( true === $result ) {
			MDS_Careers_Applications::update_field( $app['id'], 'email_status', 'sent' );
			MDS_Careers_Applications::update_field( $app['id'], 'email_error', '' );
		} else {
			MDS_Careers_Applications::update_field( $app['id'], 'email_status', 'failed' );
			MDS_Careers_Applications::update_field( $app['id'], 'email_error', (string) $result );
		}
	}

	public static function send_application_whatsapp( array $app ) {
		$phone = MDS_Careers_Settings::get( 'whatsapp_phone' );
		$token = MDS_Careers_Settings::get( 'whatsapp_access_token' );
		$phone_number_id = MDS_Careers_Settings::get( 'whatsapp_phone_number_id' );

		if ( ! $phone || ! $token || ! $phone_number_id ) {
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_status', 'not_configured' );
			return;
		}

		$summary = sprintf(
			'New application #%d: %s for %s (%s). Review in wp-admin.',
			$app['id'],
			$app['full_name'],
			$app['job_title_snapshot'],
			$app['experience'] ?: 'experience not stated'
		);

		$template = MDS_Careers_Settings::get( 'whatsapp_template_name' );
		if ( $template ) {
			// Business-initiated messages outside the 24h session window
			// require an approved template — use it if the owner has set one up.
			$payload = array(
				'messaging_product' => 'whatsapp',
				'to'                => preg_replace( '/[^0-9]/', '', $phone ),
				'type'              => 'template',
				'template'          => array(
					'name'     => $template,
					'language' => array( 'code' => MDS_Careers_Settings::get( 'whatsapp_template_lang', 'en' ) ),
					'components' => array(
						array(
							'type'       => 'body',
							'parameters' => array( array( 'type' => 'text', 'text' => $summary ) ),
						),
					),
				),
			);
		} else {
			// Plain text: only deliverable within an open 24h session
			// window, or to numbers registered as test recipients in Meta
			// Business Manager. Set a template name in Settings once one
			// is approved for reliable delivery outside that window.
			$payload = array(
				'messaging_product' => 'whatsapp',
				'to'                => preg_replace( '/[^0-9]/', '', $phone ),
				'type'              => 'text',
				'text'              => array( 'body' => $summary ),
			);
		}

		$response = wp_remote_post(
			"https://graph.facebook.com/v21.0/{$phone_number_id}/messages",
			array(
				'headers' => array(
					'Authorization' => "Bearer {$token}",
					'Content-Type'  => 'application/json',
				),
				'body'    => wp_json_encode( $payload ),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_status', 'failed' );
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_error', $response->get_error_message() );
			return;
		}
		$code = wp_remote_retrieve_response_code( $response );
		if ( $code >= 200 && $code < 300 ) {
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_status', 'sent' );
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_error', '' );
		} else {
			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			$message = $body['error']['message'] ?? ( 'HTTP ' . $code );
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_status', 'failed' );
			MDS_Careers_Applications::update_field( $app['id'], 'whatsapp_error', $message );
		}
	}

	/** Manual fallback: a prefilled wa.me link staff can click themselves — requires a human to press Send, not automatic delivery. */
	public static function whatsapp_click_to_chat_url( array $app ) {
		$phone = preg_replace( '/[^0-9]/', '', (string) MDS_Careers_Settings::get( 'whatsapp_phone' ) );
		$text  = sprintf(
			'New application #%d: %s for %s. Contact: %s',
			$app['id'],
			$app['full_name'],
			$app['job_title_snapshot'],
			$app['phone']
		);
		return 'https://wa.me/' . $phone . '?text=' . rawurlencode( $text );
	}

	/* ── partnership enquiries (email only — spec doesn't ask for WhatsApp here) ── */

	public static function send_partnership_email( array $enquiry ) {
		$to = self::recipients();
		if ( ! $to ) {
			global $wpdb;
			$wpdb->update( MDS_Careers_Partnerships::table_name(), array( 'email_status' => 'failed', 'email_error' => 'No recipients configured in Careers → Settings.' ), array( 'id' => $enquiry['id'] ) );
			return;
		}
		$admin_url = add_query_arg(
			array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-partnership', 'id' => $enquiry['id'] ),
			admin_url( 'edit.php' )
		);
		$subject = sprintf( 'New partnership enquiry: %s', $enquiry['agency_name'] );
		$body    = implode( "\n", array(
			"A new white-label/partnership enquiry was submitted on the website.",
			"",
			"Agency: {$enquiry['agency_name']}",
			"Contact: {$enquiry['contact_name']}",
			"Email: {$enquiry['work_email']}",
			"Phone/WhatsApp: {$enquiry['phone']}",
			"Services required: {$enquiry['services_required']}",
			"Estimated volume: " . ( $enquiry['estimated_volume'] ?: '—' ),
			"",
			"Review in the admin area: {$admin_url}",
		) );
		$result = self::send_mail( $to, $subject, $body );
		global $wpdb;
		if ( true === $result ) {
			$wpdb->update( MDS_Careers_Partnerships::table_name(), array( 'email_status' => 'sent', 'email_error' => '' ), array( 'id' => $enquiry['id'] ) );
		} else {
			$wpdb->update( MDS_Careers_Partnerships::table_name(), array( 'email_status' => 'failed', 'email_error' => (string) $result ), array( 'id' => $enquiry['id'] ) );
		}
	}
}
