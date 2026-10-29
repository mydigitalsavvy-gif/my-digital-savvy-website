<?php
/**
 * Candidate applications: a dedicated custom table (wp_mds_job_applications),
 * never a post type. That's deliberate — it guarantees applications can
 * never be exposed through a public REST route by accident the way a post
 * type's data sometimes can be (there is no "wp/v2/mds_applications" for a
 * misconfiguration to expose); the only code path that can read this table
 * is this class and the authenticated REST routes in class-rest-routes.php.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_Applications {
	const STATUSES = array(
		'new'         => 'New',
		'shortlisted' => 'Shortlisted',
		'interview'   => 'Interview',
		'selected'    => 'Selected',
		'rejected'    => 'Rejected',
		'withdrawn'   => 'Withdrawn',
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
		add_action( 'admin_post_mds_update_application', array( $this, 'handle_update' ) );
		add_action( 'admin_post_mds_retry_notification', array( $this, 'handle_retry' ) );
	}

	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . 'mds_job_applications';
	}

	public static function create_table() {
		global $wpdb;
		$table           = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();
		$sql             = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			job_id bigint(20) unsigned NOT NULL,
			job_title_snapshot varchar(255) NOT NULL DEFAULT '',
			full_name varchar(150) NOT NULL DEFAULT '',
			email varchar(190) NOT NULL DEFAULT '',
			phone varchar(40) NOT NULL DEFAULT '',
			employment_type varchar(30) NOT NULL DEFAULT '',
			experience varchar(255) NOT NULL DEFAULT '',
			skills text,
			portfolio_url varchar(500) NOT NULL DEFAULT '',
			resume_path varchar(255) NOT NULL DEFAULT '',
			resume_original_name varchar(255) NOT NULL DEFAULT '',
			cover_letter longtext,
			consent tinyint(1) NOT NULL DEFAULT 0,
			source varchar(50) NOT NULL DEFAULT 'website',
			status varchar(30) NOT NULL DEFAULT 'new',
			internal_notes longtext,
			submitted_at datetime NOT NULL,
			email_status varchar(20) NOT NULL DEFAULT 'pending',
			email_error text,
			whatsapp_status varchar(20) NOT NULL DEFAULT 'pending',
			whatsapp_error text,
			PRIMARY KEY  (id),
			KEY job_id (job_id),
			KEY status (status),
			KEY submitted_at (submitted_at)
		) {$charset_collate};";
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/** Server-side-trusted insert (REST route has already re-validated everything). Returns the new row ID or WP_Error. */
	public static function insert( array $data ) {
		global $wpdb;
		$ok = $wpdb->insert(
			self::table_name(),
			array(
				'job_id'                => (int) $data['job_id'],
				'job_title_snapshot'    => $data['job_title'],
				'full_name'             => $data['full_name'],
				'email'                 => $data['email'],
				'phone'                 => $data['phone'],
				'employment_type'       => $data['employment_type'],
				'experience'            => $data['experience'],
				'skills'                => $data['skills'],
				'portfolio_url'         => $data['portfolio_url'],
				'resume_path'           => $data['resume_path'],
				'resume_original_name'  => $data['resume_original_name'],
				'cover_letter'          => $data['cover_letter'],
				'consent'              => ! empty( $data['consent'] ) ? 1 : 0,
				'source'               => $data['source'] ?: 'website',
				'status'               => 'new',
				'submitted_at'          => current_time( 'mysql' ),
				'email_status'          => 'pending',
				'whatsapp_status'       => 'pending',
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
		);
		if ( false === $ok ) {
			return new WP_Error( 'mds_db_error', 'Could not save the application.' );
		}
		return (int) $wpdb->insert_id;
	}

	public static function get( $id ) {
		global $wpdb;
		$table = self::table_name();
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );
	}

	public static function update_field( $id, $field, $value ) {
		global $wpdb;
		$wpdb->update( self::table_name(), array( $field => $value ), array( 'id' => (int) $id ) );
	}

	/* ── admin screen ─────────────────────────────────────────────── */

	public function register_menu() {
		add_submenu_page(
			'edit.php?post_type=' . MDS_Careers_Jobs_CPT::POST_TYPE,
			'Applications',
			'Applications',
			MDS_CAREERS_CAP,
			'mds-careers-applications',
			array( $this, 'render_list' )
		);
		add_submenu_page(
			'', // hidden detail screen, reached only by link
			'Application',
			'Application',
			MDS_CAREERS_CAP,
			'mds-careers-application',
			array( $this, 'render_detail' )
		);
	}

	private function base_url( $args = array() ) {
		return add_query_arg( $args, admin_url( 'edit.php?post_type=' . MDS_Careers_Jobs_CPT::POST_TYPE . '&page=mds-careers-applications' ) );
	}

	public function render_list() {
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to view this page.' );
		}
		global $wpdb;
		$table = self::table_name();

		$status_filter = isset( $_GET['status'] ) ? sanitize_key( $_GET['status'] ) : '';
		$job_filter    = isset( $_GET['job_id'] ) ? (int) $_GET['job_id'] : 0;
		$type_filter   = isset( $_GET['employment_type'] ) ? sanitize_key( $_GET['employment_type'] ) : '';
		$search        = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$paged         = max( 1, (int) ( $_GET['paged'] ?? 1 ) );
		$per_page      = 20;

		$where  = array( '1=1' );
		$params = array();
		if ( $status_filter && array_key_exists( $status_filter, self::STATUSES ) ) {
			$where[]  = 'status = %s';
			$params[] = $status_filter;
		}
		if ( $job_filter ) {
			$where[]  = 'job_id = %d';
			$params[] = $job_filter;
		}
		if ( $type_filter ) {
			$where[]  = 'employment_type = %s';
			$params[] = $type_filter;
		}
		if ( $search ) {
			if ( ctype_digit( $search ) ) {
				$where[]  = 'id = %d';
				$params[] = (int) $search;
			} else {
				$where[]  = '(full_name LIKE %s OR email LIKE %s)';
				$like     = '%' . $wpdb->esc_like( $search ) . '%';
				$params[] = $like;
				$params[] = $like;
			}
		}
		$where_sql = implode( ' AND ', $where );

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";
		$total     = (int) ( $params ? $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) : $wpdb->get_var( $count_sql ) );

		$offset = ( $paged - 1 ) * $per_page;
		$list_sql = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY submitted_at DESC LIMIT %d OFFSET %d";
		$list_params = array_merge( $params, array( $per_page, $offset ) );
		$rows = $wpdb->get_results( $wpdb->prepare( $list_sql, $list_params ), ARRAY_A );

		echo '<div class="wrap"><h1>Applications</h1>';

		echo '<form method="get">';
		echo '<input type="hidden" name="post_type" value="' . esc_attr( MDS_Careers_Jobs_CPT::POST_TYPE ) . '">';
		echo '<input type="hidden" name="page" value="mds-careers-applications">';
		echo '<p class="search-box" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
		printf( '<input type="search" name="s" value="%s" placeholder="Search by name, email or ID">', esc_attr( $search ) );
		echo '<select name="status"><option value="">All statuses</option>';
		foreach ( self::STATUSES as $key => $label ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $status_filter, $key, false ), esc_html( $label ) );
		}
		echo '</select>';
		echo '<select name="employment_type"><option value="">All employment types</option>';
		foreach ( MDS_Careers_Jobs_CPT::EMPLOYMENT_TYPES as $key => $label ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $type_filter, $key, false ), esc_html( $label ) );
		}
		echo '</select>';
		submit_button( 'Filter', 'secondary', '', false );
		echo '</p></form>';

		echo '<table class="wp-list-table widefat fixed striped">';
		echo '<thead><tr><th>ID</th><th>Candidate</th><th>Job</th><th>Type</th><th>Status</th><th>Submitted</th><th>Email</th><th>WhatsApp</th><th></th></tr></thead><tbody>';
		if ( ! $rows ) {
			echo '<tr><td colspan="9">No applications found.</td></tr>';
		}
		foreach ( (array) $rows as $row ) {
			$detail_url = add_query_arg(
				array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-application', 'id' => $row['id'] ),
				admin_url( 'edit.php' )
			);
			printf(
				'<tr><td>#%d</td><td><a href="%s">%s</a><br><small>%s</small></td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td><a class="button button-small" href="%s">View</a></td></tr>',
				(int) $row['id'],
				esc_url( $detail_url ),
				esc_html( $row['full_name'] ),
				esc_html( $row['email'] ),
				esc_html( $row['job_title_snapshot'] ),
				esc_html( MDS_Careers_Jobs_CPT::EMPLOYMENT_TYPES[ $row['employment_type'] ] ?? $row['employment_type'] ),
				esc_html( self::STATUSES[ $row['status'] ] ?? $row['status'] ),
				esc_html( mysql2date( 'd M Y, H:i', $row['submitted_at'] ) ),
				esc_html( ucfirst( $row['email_status'] ) ),
				esc_html( ucfirst( $row['whatsapp_status'] ) ),
				esc_url( $detail_url )
			);
		}
		echo '</tbody></table>';

		$total_pages = (int) ceil( $total / $per_page );
		if ( $total_pages > 1 ) {
			echo '<div class="tablenav"><div class="tablenav-pages">';
			echo paginate_links( array(
				'base'      => add_query_arg( 'paged', '%#%' ),
				'format'    => '',
				'current'   => $paged,
				'total'     => $total_pages,
			) );
			echo '</div></div>';
		}
		echo '</div>';
	}

	public function render_detail() {
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to view this page.' );
		}
		$id  = (int) ( $_GET['id'] ?? 0 );
		$app = self::get( $id );
		if ( ! $app ) {
			echo '<div class="wrap"><h1>Application not found</h1></div>';
			return;
		}
		$nonce = wp_create_nonce( 'mds_app_update_' . $id );
		?>
		<div class="wrap">
			<h1>Application #<?php echo (int) $app['id']; ?> — <?php echo esc_html( $app['full_name'] ); ?></h1>
			<p><a href="<?php echo esc_url( $this->base_url() ); ?>">&larr; Back to all applications</a></p>

			<table class="form-table">
				<tr><th>Job</th><td><?php echo esc_html( $app['job_title_snapshot'] ); ?></td></tr>
				<tr><th>Email</th><td><a href="mailto:<?php echo esc_attr( $app['email'] ); ?>"><?php echo esc_html( $app['email'] ); ?></a></td></tr>
				<tr><th>Phone / WhatsApp</th><td><?php echo esc_html( $app['phone'] ); ?></td></tr>
				<tr><th>Employment type</th><td><?php echo esc_html( MDS_Careers_Jobs_CPT::EMPLOYMENT_TYPES[ $app['employment_type'] ] ?? $app['employment_type'] ); ?></td></tr>
				<tr><th>Experience</th><td><?php echo esc_html( $app['experience'] ); ?></td></tr>
				<tr><th>Skills</th><td><?php echo nl2br( esc_html( $app['skills'] ) ); ?></td></tr>
				<tr><th>Portfolio / LinkedIn</th><td><?php echo $app['portfolio_url'] ? '<a href="' . esc_url( $app['portfolio_url'] ) . '" target="_blank" rel="noopener">' . esc_html( $app['portfolio_url'] ) . '</a>' : '—'; ?></td></tr>
				<tr><th>Cover letter</th><td><?php echo nl2br( esc_html( $app['cover_letter'] ) ); ?></td></tr>
				<tr><th>Résumé</th><td>
					<?php if ( $app['resume_path'] ) : ?>
						<a class="button" href="<?php echo esc_url( MDS_Careers_Resume_Storage::download_url( $app['id'] ) ); ?>">Download résumé</a>
						<span class="description"><?php echo esc_html( $app['resume_original_name'] ); ?></span>
					<?php else : ?>
						—
					<?php endif; ?>
				</td></tr>
				<tr><th>Submitted</th><td><?php echo esc_html( mysql2date( 'd M Y, H:i', $app['submitted_at'] ) ); ?> · Source: <?php echo esc_html( $app['source'] ); ?></td></tr>
				<tr><th>Email notification</th><td>
					<?php echo esc_html( ucfirst( $app['email_status'] ) ); ?>
					<?php if ( $app['email_error'] ) : ?><br><small><?php echo esc_html( $app['email_error'] ); ?></small><?php endif; ?>
					<?php if ( 'sent' !== $app['email_status'] ) : ?>
						<?php echo $this->retry_button( $id, 'email' ); ?>
					<?php endif; ?>
				</td></tr>
				<tr><th>WhatsApp notification</th><td>
					<?php echo esc_html( ucfirst( $app['whatsapp_status'] ) ); ?>
					<?php if ( $app['whatsapp_error'] ) : ?><br><small><?php echo esc_html( $app['whatsapp_error'] ); ?></small><?php endif; ?>
					<?php if ( ! in_array( $app['whatsapp_status'], array( 'sent', 'not_configured' ), true ) ) : ?>
						<?php echo $this->retry_button( $id, 'whatsapp' ); ?>
					<?php endif; ?>
					<?php if ( 'not_configured' === $app['whatsapp_status'] ) : ?>
						<br><small>Automatic WhatsApp delivery isn't configured — see Careers → Settings. You can still
						<a href="<?php echo esc_url( MDS_Careers_Notifications::whatsapp_click_to_chat_url( $app ) ); ?>" target="_blank" rel="noopener">message this candidate's number on WhatsApp</a> manually.</small>
					<?php endif; ?>
				</td></tr>
			</table>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="mds_update_application">
				<input type="hidden" name="id" value="<?php echo (int) $id; ?>">
				<?php wp_nonce_field( 'mds_app_update_' . $id ); ?>
				<table class="form-table">
					<tr>
						<th><label for="mds_app_status">Status</label></th>
						<td>
							<select name="status" id="mds_app_status">
								<?php foreach ( self::STATUSES as $key => $label ) : ?>
									<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $app['status'], $key ); ?>><?php echo esc_html( $label ); ?></option>
								<?php endforeach; ?>
							</select>
						</td>
					</tr>
					<tr>
						<th><label for="mds_app_notes">Internal notes</label></th>
						<td><textarea name="internal_notes" id="mds_app_notes" rows="5" style="width:100%;max-width:560px;"><?php echo esc_textarea( $app['internal_notes'] ); ?></textarea>
						<p class="description">Visible only to authorized staff — never shown to the candidate or the public site.</p></td>
					</tr>
				</table>
				<?php submit_button( 'Save' ); ?>
			</form>
		</div>
		<?php
	}

	private function retry_button( $id, $channel ) {
		$url = wp_nonce_url(
			add_query_arg( array( 'action' => 'mds_retry_notification', 'id' => $id, 'channel' => $channel ), admin_url( 'admin-post.php' ) ),
			'mds_retry_' . $id . '_' . $channel
		);
		return ' <a class="button button-small" href="' . esc_url( $url ) . '">Retry</a>';
	}

	public function handle_update() {
		$id = (int) ( $_POST['id'] ?? 0 );
		check_admin_referer( 'mds_app_update_' . $id );
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
		wp_safe_redirect( add_query_arg( array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-application', 'id' => $id, 'updated' => 1 ), admin_url( 'edit.php' ) ) );
		exit;
	}

	public function handle_retry() {
		$id      = (int) ( $_GET['id'] ?? 0 );
		$channel = sanitize_key( $_GET['channel'] ?? '' );
		check_admin_referer( 'mds_retry_' . $id . '_' . $channel );
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to do this.' );
		}
		$app = self::get( $id );
		if ( $app ) {
			if ( 'email' === $channel ) {
				MDS_Careers_Notifications::send_application_email( $app );
			} elseif ( 'whatsapp' === $channel ) {
				MDS_Careers_Notifications::send_application_whatsapp( $app );
			}
		}
		wp_safe_redirect( add_query_arg( array( 'post_type' => MDS_Careers_Jobs_CPT::POST_TYPE, 'page' => 'mds-careers-application', 'id' => $id, 'retried' => $channel ), admin_url( 'edit.php' ) ) );
		exit;
	}
}
