<?php
/**
 * White-label / freelance partnership enquiries: a separate custom table
 * from job applications (wp_mds_partnership_enquiries), with its own admin
 * screen — never mixed with candidate applications, per spec.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_Partnerships {
	const STATUSES = array(
		'new'        => 'New',
		'contacted'  => 'Contacted',
		'in-talks'   => 'In talks',
		'closed-won'  => 'Closed — won',
		'closed-lost' => 'Closed — lost',
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
		add_action( 'admin_post_mds_update_partnership', array( $this, 'handle_update' ) );
	}

	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . 'mds_partnership_enquiries';
	}

	public static function create_table() {
		global $wpdb;
		$table           = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();
		$sql             = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			agency_name varchar(200) NOT NULL DEFAULT '',
			contact_name varchar(150) NOT NULL DEFAULT '',
			work_email varchar(190) NOT NULL DEFAULT '',
			phone varchar(40) NOT NULL DEFAULT '',
			services_required text,
			estimated_volume varchar(255) NOT NULL DEFAULT '',
			message longtext,
			consent tinyint(1) NOT NULL DEFAULT 0,
			source varchar(50) NOT NULL DEFAULT 'website',
			status varchar(30) NOT NULL DEFAULT 'new',
			internal_notes longtext,
			submitted_at datetime NOT NULL,
			email_status varchar(20) NOT NULL DEFAULT 'pending',
			email_error text,
			PRIMARY KEY  (id),
			KEY status (status),
			KEY submitted_at (submitted_at)
		) {$charset_collate};";
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	public static function insert( array $data ) {
		global $wpdb;
		$ok = $wpdb->insert(
			self::table_name(),
			array(
				'agency_name'       => $data['agency_name'],
				'contact_name'      => $data['contact_name'],
				'work_email'        => $data['work_email'],
				'phone'             => $data['phone'],
				'services_required' => $data['services_required'],
				'estimated_volume'  => $data['estimated_volume'],
				'message'           => $data['message'],
				'consent'           => ! empty( $data['consent'] ) ? 1 : 0,
				'source'            => $data['source'] ?: 'website',
				'status'            => 'new',
				'submitted_at'      => current_time( 'mysql' ),
				'email_status'      => 'pending',
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s' )
		);
		if ( false === $ok ) {
			return new WP_Error( 'mds_db_error', 'Could not save the enquiry.' );
		}
		return (int) $wpdb->insert_id;
	}

	public static function get( $id ) {
		global $wpdb;
		$table = self::table_name();
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );
	}

	public function register_menu() {
		add_submenu_page(
			'edit.php?post_type=' . MDS_Careers_Jobs_CPT::POST_TYPE,
			'Partnership enquiries',
			'Partnerships',
			MDS_CAREERS_CAP,
			'mds-careers-partnerships',
			array( $this, 'render_list' )
		);
		add_submenu_page(
			'',
			'Partnership enquiry',
			'Partnership enquiry',
			MDS_CAREERS_CAP,
			'mds-careers-partnership',
			array( $this, 'render_detail' )
		);
	}

	public function render_list() {
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to view this page.' );
		}
		global $wpdb;
		$table  = self::table_name();
		$status_filter = isset( $_GET['status'] ) ? sanitize_key( $_GET['status'] ) : '';
		$where  = '1=1';
		$params = array();
		if ( $status_filter && array_key_exists( $status_filter, self::STATUSES ) ) {
			$where    = 'status = %s';
			$params[] = $status_filter;
		}
		$sql  = "SELECT * FROM {$table} WHERE {$where} ORDER BY submitted_at DESC LIMIT 100";
		$rows = $params ? $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ) : $wpdb->get_results( $sql, ARRAY_A );

		echo '<div class="wrap"><h1>Partnership enquiries</h1>';
		echo '<p class="description">White-label and freelance partnership enquiries — kept separate from job applications.</p>';

		echo '<form method="get" style="margin-bottom:12px;">';
		echo '<input type="hidden" name="post_type" value="' . esc_attr( MDS_Careers_Jobs_CPT::POST_TYPE ) . '">';
		echo '<input type="hidden" name="page" value="mds-careers-partnerships">';
		echo '<select name="status" onchange="this.form.submit()"><option value="">All statuses</option>';
		foreach ( self::STATUSES as $key => $label ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $status_filter, $key, false ), esc_html( $label ) );
		}
		echo '</select></form>';

		echo '<table class="wp-list-table widefat fixed striped">';
		echo '<thead><tr><th>ID</th><th>Agency</th><th>Contact</th><th>Services required</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>';
		if ( ! $rows ) {
			echo '<tr><td colspan="7">No partnership enquiries yet.</td></tr>';
		}
		foreach ( (array) $rows as $row ) {
			$detail_url = add_query_arg(
				array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-partnership', 'id' => $row['id'] ),
				admin_url( 'edit.php' )
			);
			printf(
				'<tr><td>#%d</td><td>%s</td><td><a href="%s">%s</a><br><small>%s</small></td><td>%s</td><td>%s</td><td>%s</td><td><a class="button button-small" href="%s">View</a></td></tr>',
				(int) $row['id'],
				esc_html( $row['agency_name'] ),
				esc_url( $detail_url ),
				esc_html( $row['contact_name'] ),
				esc_html( $row['work_email'] ),
				esc_html( wp_trim_words( $row['services_required'], 10 ) ),
				esc_html( self::STATUSES[ $row['status'] ] ?? $row['status'] ),
				esc_html( mysql2date( 'd M Y, H:i', $row['submitted_at'] ) ),
				esc_url( $detail_url )
			);
		}
		echo '</tbody></table></div>';
	}

	public function render_detail() {
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to view this page.' );
		}
		$id      = (int) ( $_GET['id'] ?? 0 );
		$enquiry = self::get( $id );
		if ( ! $enquiry ) {
			echo '<div class="wrap"><h1>Enquiry not found</h1></div>';
			return;
		}
		?>
		<div class="wrap">
			<h1>Enquiry #<?php echo (int) $enquiry['id']; ?> — <?php echo esc_html( $enquiry['agency_name'] ); ?></h1>
			<table class="form-table">
				<tr><th>Contact</th><td><?php echo esc_html( $enquiry['contact_name'] ); ?></td></tr>
				<tr><th>Work email</th><td><a href="mailto:<?php echo esc_attr( $enquiry['work_email'] ); ?>"><?php echo esc_html( $enquiry['work_email'] ); ?></a></td></tr>
				<tr><th>Phone / WhatsApp</th><td><?php echo esc_html( $enquiry['phone'] ); ?></td></tr>
				<tr><th>Services required</th><td><?php echo nl2br( esc_html( $enquiry['services_required'] ) ); ?></td></tr>
				<tr><th>Estimated volume</th><td><?php echo esc_html( $enquiry['estimated_volume'] ?: '—' ); ?></td></tr>
				<tr><th>Message</th><td><?php echo nl2br( esc_html( $enquiry['message'] ) ); ?></td></tr>
				<tr><th>Submitted</th><td><?php echo esc_html( mysql2date( 'd M Y, H:i', $enquiry['submitted_at'] ) ); ?></td></tr>
				<tr><th>Email notification</th><td><?php echo esc_html( ucfirst( $enquiry['email_status'] ) ); ?></td></tr>
			</table>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="mds_update_partnership">
				<input type="hidden" name="id" value="<?php echo (int) $id; ?>">
				<?php wp_nonce_field( 'mds_partnership_update_' . $id ); ?>
				<table class="form-table">
					<tr>
						<th><label for="mds_p_status">Status</label></th>
						<td>
							<select name="status" id="mds_p_status">
								<?php foreach ( self::STATUSES as $key => $label ) : ?>
									<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $enquiry['status'], $key ); ?>><?php echo esc_html( $label ); ?></option>
								<?php endforeach; ?>
							</select>
						</td>
					</tr>
					<tr>
						<th><label for="mds_p_notes">Internal notes</label></th>
						<td><textarea name="internal_notes" id="mds_p_notes" rows="5" style="width:100%;max-width:560px;"><?php echo esc_textarea( $enquiry['internal_notes'] ); ?></textarea></td>
					</tr>
				</table>
				<?php submit_button( 'Save' ); ?>
			</form>
		</div>
		<?php
	}

	public function handle_update() {
		$id = (int) ( $_POST['id'] ?? 0 );
		check_admin_referer( 'mds_partnership_update_' . $id );
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to do this.' );
		}
		$status = sanitize_key( $_POST['status'] ?? 'new' );
		if ( ! array_key_exists( $status, self::STATUSES ) ) {
			$status = 'new';
		}
		global $wpdb;
		$wpdb->update(
			self::table_name(),
			array(
				'status'         => $status,
				'internal_notes' => sanitize_textarea_field( $_POST['internal_notes'] ?? '' ),
			),
			array( 'id' => $id )
		);
		wp_safe_redirect( add_query_arg( array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-partnership', 'id' => $id, 'updated' => 1 ), admin_url( 'edit.php' ) ) );
		exit;
	}
}
