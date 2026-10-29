<?php
/**
 * Plugin Name: MDS Careers
 * Description: Job listings, candidate applications and white-label partnership enquiries for the My Digital Savvy Next.js Careers section.
 * Version:     1.0.0
 * Author:      My Digital Savvy
 * Text Domain: mds-careers
 *
 * STATUS: prepared, NOT installed on the live site. Installing requires
 * explicit approval from the site owner — see README.md in this folder.
 *
 * This file is the contract with the Next.js frontend:
 *   frontend/lib/careers/wp-client.ts  (reads/writes)
 *   frontend/lib/careers/jobs.ts       (job field names below)
 *   frontend/types/careers.ts          (JobModel shape)
 * A regular (not must-use) plugin on purpose: it owns a database schema
 * that needs a real activation hook (dbDelta runs once, cleanly, here),
 * and — unlike the always-on headless-API mu-plugins — this is a feature
 * the owner may reasonably want to toggle on/off from the Plugins screen.
 *
 * Nothing in this plugin touches any existing page, post, theme or other
 * plugin's data. It only creates its own post type and its own tables.
 */

defined( 'ABSPATH' ) || exit;

define( 'MDS_CAREERS_VERSION', '1.0.0' );
define( 'MDS_CAREERS_DB_VERSION', '1' );
define( 'MDS_CAREERS_FILE', __FILE__ );
define( 'MDS_CAREERS_DIR', plugin_dir_path( __FILE__ ) );
define( 'MDS_CAREERS_CAP', 'mds_manage_careers' );

require_once MDS_CAREERS_DIR . 'includes/class-jobs-cpt.php';
require_once MDS_CAREERS_DIR . 'includes/class-applications.php';
require_once MDS_CAREERS_DIR . 'includes/class-partnerships.php';
require_once MDS_CAREERS_DIR . 'includes/class-resume-storage.php';
require_once MDS_CAREERS_DIR . 'includes/class-notifications.php';
require_once MDS_CAREERS_DIR . 'includes/class-rest-routes.php';
require_once MDS_CAREERS_DIR . 'includes/class-settings.php';

/**
 * Boot. Every class below hooks itself (init/rest_api_init/admin_menu/…)
 * from its own constructor so this file stays a plain bootstrap.
 */
function mds_careers_init() {
	MDS_Careers_Jobs_CPT::instance();
	MDS_Careers_Applications::instance();
	MDS_Careers_Partnerships::instance();
	MDS_Careers_Resume_Storage::instance();
	MDS_Careers_Notifications::instance();
	MDS_Careers_REST_Routes::instance();
	MDS_Careers_Settings::instance();
}
add_action( 'plugins_loaded', 'mds_careers_init' );

/**
 * Creates the custom tables and the Recruiter role. dbDelta is idempotent,
 * so this is also safe to re-run if the schema version bumps later — see
 * mds_careers_maybe_upgrade() below, which covers the case where the
 * plugin's PHP is updated by re-uploading files without a deactivate/
 * reactivate cycle (dbDelta then never runs again on its own).
 */
function mds_careers_activate() {
	MDS_Careers_Applications::create_table();
	MDS_Careers_Partnerships::create_table();
	MDS_Careers_Resume_Storage::create_protected_directory();
	mds_careers_install_roles();
	update_option( 'mds_careers_db_version', MDS_CAREERS_DB_VERSION );
	flush_rewrite_rules();
}
register_activation_hook( MDS_CAREERS_FILE, 'mds_careers_activate' );

function mds_careers_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( MDS_CAREERS_FILE, 'mds_careers_deactivate' );

/** Re-applies the schema if the plugin files were updated without a reactivate. */
add_action( 'plugins_loaded', function () {
	if ( get_option( 'mds_careers_db_version' ) !== MDS_CAREERS_DB_VERSION ) {
		mds_careers_activate();
	}
}, 1 );

/**
 * A "Recruiter" role that can manage jobs/applications/partnerships but not
 * the Settings screen (credentials, shared secret) — that stays admin-only.
 * Administrators get the plugin capability too so nothing is locked out of
 * the existing admin account.
 */
function mds_careers_install_roles() {
	add_role( 'mds_recruiter', 'Recruiter', array(
		'read'          => true,
		MDS_CAREERS_CAP => true,
	) );
	$admin = get_role( 'administrator' );
	if ( $admin && ! $admin->has_cap( MDS_CAREERS_CAP ) ) {
		$admin->add_cap( MDS_CAREERS_CAP );
	}
}
