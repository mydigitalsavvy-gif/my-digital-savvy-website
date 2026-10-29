<?php
/**
 * Careers → Settings: recipient emails, WhatsApp Cloud API credentials, the
 * shared secret the Next.js API routes authenticate with, and the editable
 * copy for the three opportunity categories. Admin-only (manage_options) —
 * separate from the Jobs/Applications/Partnerships screens, which a
 * Recruiter-role account can reach without ever seeing credentials.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_Settings {
	const OPTION_KEY = 'mds_careers_settings';

	const DEFAULT_CATEGORIES = array(
		array(
			'type'        => 'full-time',
			'label'       => 'Full-time roles',
			'description' => 'For candidates seeking regular employment with My Digital Savvy.',
		),
		array(
			'type'        => 'freelance',
			'label'       => 'Freelance opportunities',
			'description' => 'For independent professionals interested in project-based or flexible work.',
		),
		array(
			'type'        => 'white-label',
			'label'       => 'White-label services for agencies',
			'description' => 'For agencies that want My Digital Savvy to deliver services under their own brand.',
		),
	);

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ), 20 );
	}

	private static function all() {
		$stored = get_option( self::OPTION_KEY, array() );
		return is_array( $stored ) ? $stored : array();
	}

	public static function get( $key, $default = '' ) {
		$all = self::all();
		return isset( $all[ $key ] ) && '' !== $all[ $key ] ? $all[ $key ] : $default;
	}

	public static function get_categories() {
		$stored = self::all()['categories'] ?? null;
		if ( ! is_array( $stored ) || count( $stored ) !== 3 ) {
			return self::DEFAULT_CATEGORIES;
		}
		return $stored;
	}

	public function register_menu() {
		add_submenu_page(
			'edit.php?post_type=' . MDS_Careers_Jobs_CPT::POST_TYPE,
			'Careers settings',
			'Settings',
			'manage_options',
			'mds-careers-settings',
			array( $this, 'render' )
		);
	}

	public function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'You do not have permission to view this page.' );
		}
		if ( isset( $_POST['mds_careers_settings_nonce'] ) && wp_verify_nonce( $_POST['mds_careers_settings_nonce'], 'mds_careers_settings_save' ) ) {
			$this->save();
			echo '<div class="notice notice-success"><p>Settings saved.</p></div>';
		}

		$values     = self::all();
		$categories = self::get_categories();
		$field      = fn( $key, $default = '' ) => esc_attr( $values[ $key ] ?? $default );
		?>
		<div class="wrap">
			<h1>Careers settings</h1>
			<form method="post">
				<?php wp_nonce_field( 'mds_careers_settings_save', 'mds_careers_settings_nonce' ); ?>

				<h2>Notification recipients</h2>
				<p class="description">Both configured addresses receive application and partnership-enquiry notifications (duplicates are automatically skipped if they're the same address). Leave either blank to skip it.</p>
				<table class="form-table">
					<tr><th><label for="notification_email">HIRING_NOTIFICATION_EMAIL</label></th>
						<td><input type="email" class="regular-text" name="notification_email" id="notification_email" value="<?php echo $field( 'notification_email', 'hr@mydigitalsavvy.com' ); ?>"></td></tr>
					<tr><th><label for="hr_email">HIRING_HR_EMAIL</label></th>
						<td><input type="email" class="regular-text" name="hr_email" id="hr_email" value="<?php echo $field( 'hr_email', 'hr@mydigitalsavvy.com' ); ?>"></td></tr>
				</table>

				<h2>WhatsApp notifications (optional)</h2>
				<p class="description">
					Requires an approved WhatsApp Business Platform (Cloud API) number. Leave these blank to skip automatic
					WhatsApp delivery. Applications are still saved and emailed normally either way, and each application's
					admin screen offers a manual click-to-chat link instead.
				</p>
				<table class="form-table">
					<tr><th><label for="whatsapp_phone">HIRING_WHATSAPP_PHONE</label></th>
						<td><input type="text" class="regular-text" name="whatsapp_phone" id="whatsapp_phone" value="<?php echo $field( 'whatsapp_phone', '917378842121' ); ?>" placeholder="Digits with country code, e.g. 917378842121">
						<p class="description">This is the Careers/HR WhatsApp number, separate from the general enquiry number used elsewhere on the site.</p></td></tr>
					<tr><th><label for="whatsapp_phone_number_id">WHATSAPP_PHONE_NUMBER_ID</label></th>
						<td><input type="text" class="regular-text" name="whatsapp_phone_number_id" id="whatsapp_phone_number_id" value="<?php echo $field( 'whatsapp_phone_number_id' ); ?>"></td></tr>
					<tr><th><label for="whatsapp_access_token">WHATSAPP_ACCESS_TOKEN</label></th>
						<td><input type="password" class="regular-text" autocomplete="off" name="whatsapp_access_token" id="whatsapp_access_token" value="<?php echo $field( 'whatsapp_access_token' ); ?>"></td></tr>
					<tr><th><label for="whatsapp_template_name">Approved template name (optional)</label></th>
						<td><input type="text" class="regular-text" name="whatsapp_template_name" id="whatsapp_template_name" value="<?php echo $field( 'whatsapp_template_name' ); ?>">
						<p class="description">Business-initiated WhatsApp messages outside an open 24-hour session require a Meta-approved template. Without one, delivery is best-effort only (open session window or registered test numbers).</p></td></tr>
					<tr><th><label for="whatsapp_template_lang">Template language code</label></th>
						<td><input type="text" class="small-text" name="whatsapp_template_lang" id="whatsapp_template_lang" value="<?php echo $field( 'whatsapp_template_lang', 'en' ); ?>"></td></tr>
				</table>

				<h2>Frontend connection</h2>
				<table class="form-table">
					<tr><th><label for="shared_secret">Shared secret</label></th>
						<td><input type="text" class="regular-text" name="shared_secret" id="shared_secret" value="<?php echo $field( 'shared_secret' ); ?>">
						<p class="description">A long random string. Enter the exact same value as the <code>MDS_CAREERS_SECRET</code> environment variable in the Next.js site's Vercel project — this is how the website authenticates its requests to this plugin.</p></td></tr>
				</table>

				<h2>Opportunity categories</h2>
				<p class="description">Shown on the public Careers page's "Ways to work with us" section. The three categories themselves are fixed (they're wired into specific parts of the site); only the label and description are editable here.</p>
				<table class="form-table">
					<?php foreach ( $categories as $i => $cat ) : ?>
						<tr>
							<th><?php echo esc_html( $cat['type'] ); ?></th>
							<td>
								<input type="hidden" name="category_type[]" value="<?php echo esc_attr( $cat['type'] ); ?>">
								<p><label>Label<br><input type="text" class="regular-text" name="category_label[]" value="<?php echo esc_attr( $cat['label'] ); ?>"></label></p>
								<p><label>Description<br><textarea class="large-text" name="category_description[]" rows="2"><?php echo esc_textarea( $cat['description'] ); ?></textarea></label></p>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>

				<?php submit_button( 'Save settings' ); ?>
			</form>
		</div>
		<?php
	}

	private function save() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$categories   = array();
		$types        = (array) ( $_POST['category_type'] ?? array() );
		$labels       = (array) ( $_POST['category_label'] ?? array() );
		$descriptions = (array) ( $_POST['category_description'] ?? array() );
		foreach ( $types as $i => $type ) {
			$categories[] = array(
				'type'        => sanitize_key( $type ),
				'label'       => sanitize_text_field( $labels[ $i ] ?? '' ),
				'description' => sanitize_textarea_field( $descriptions[ $i ] ?? '' ),
			);
		}
		update_option( self::OPTION_KEY, array(
			'notification_email'       => sanitize_email( $_POST['notification_email'] ?? '' ),
			'hr_email'                 => sanitize_email( $_POST['hr_email'] ?? '' ),
			'whatsapp_phone'           => sanitize_text_field( $_POST['whatsapp_phone'] ?? '' ),
			'whatsapp_phone_number_id' => sanitize_text_field( $_POST['whatsapp_phone_number_id'] ?? '' ),
			'whatsapp_access_token'    => sanitize_text_field( $_POST['whatsapp_access_token'] ?? '' ),
			'whatsapp_template_name'   => sanitize_text_field( $_POST['whatsapp_template_name'] ?? '' ),
			'whatsapp_template_lang'   => sanitize_text_field( $_POST['whatsapp_template_lang'] ?? 'en' ),
			'shared_secret'            => sanitize_text_field( $_POST['shared_secret'] ?? '' ),
			'categories'               => $categories ?: self::DEFAULT_CATEGORIES,
		) );
	}
}
