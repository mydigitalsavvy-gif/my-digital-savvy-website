<?php
/**
 * Jobs custom post type. Deliberately no ACF/SCF dependency (not installed
 * on the live site) — fields are plain register_post_meta() + a hand-rolled
 * meta box, so this plugin works standalone with nothing else to install.
 *
 * post_status stays WordPress's own 'publish' once an editor clicks the
 * native Publish button (that's just "this record exists"); the actual
 * public-facing recruitment state is the separate _mds_status meta field
 * below (draft/published/closed/archived) — the single source of truth
 * the REST route and the admin list both read. This mirrors how many WP
 * plugins separate "post exists" from "customer-facing visibility" (e.g.
 * WooCommerce stock status) and avoids fighting WordPress's own Draft/
 * Publish UI to get four states out of it.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_Jobs_CPT {
	const POST_TYPE = 'mds_job';

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	const META_FIELDS = array(
		'_mds_vacancies'             => 'integer',
		'_mds_experience_required'   => 'string',
		'_mds_employment_type'       => 'string',
		'_mds_status'                => 'string',
		'_mds_category'              => 'string',
		'_mds_location'              => 'string',
		'_mds_work_arrangement'      => 'string',
		'_mds_summary'               => 'string',
		'_mds_responsibilities'      => 'string', // newline-separated in meta; array on the REST route
		'_mds_required_skills'       => 'string',
		'_mds_qualifications'        => 'string',
		'_mds_compensation'          => 'string',
		'_mds_application_deadline'  => 'string', // YYYY-MM-DD
	);

	const EMPLOYMENT_TYPES = array(
		'full-time'   => 'Full-time',
		'freelance'   => 'Freelance',
		'white-label' => 'White-label',
	);

	const STATUSES = array(
		'draft'     => 'Draft (not public)',
		'published' => 'Published (visible, accepting applications)',
		'closed'    => 'Closed (visible, not accepting applications)',
		'archived'  => 'Archived (hidden from the public site)',
	);

	private function __construct() {
		add_action( 'init', array( $this, 'register_post_type' ) );
		add_action( 'init', array( $this, 'register_meta' ) );
		add_action( 'add_meta_boxes', array( $this, 'add_meta_box' ) );
		add_action( 'save_post_' . self::POST_TYPE, array( $this, 'save' ), 10, 2 );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( $this, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( $this, 'render_column' ), 10, 2 );
		add_action( 'restrict_manage_posts', array( $this, 'status_filter_dropdown' ) );
		add_action( 'pre_get_posts', array( $this, 'apply_status_filter' ) );
	}

	public function register_post_type() {
		register_post_type( self::POST_TYPE, array(
			'label'              => 'Careers',
			'labels'             => array(
				'name'          => 'Careers',
				'singular_name' => 'Job',
				'add_new_item'  => 'Add job',
				'edit_item'     => 'Edit job',
				'search_items'  => 'Search jobs',
				'not_found'     => 'No jobs yet',
				'all_items'     => 'Jobs',
			),
			// Not public in WordPress's own sense: no front-end template, no
			// core wp/v2 REST exposure. The Next.js site renders everything;
			// this plugin's own mds-careers/v1/jobs route is the only way
			// job data leaves WordPress, so draft/archived jobs can never
			// leak through a generic REST query.
			'public'             => false,
			'show_ui'            => true,
			'show_in_menu'       => true,
			'show_in_rest'       => false,
			'menu_icon'          => 'dashicons-businessman',
			'menu_position'      => 25,
			'supports'           => array( 'title' ),
			'capability_type'    => array( 'mds_job', 'mds_jobs' ),
			'map_meta_cap'       => true,
			'capabilities'       => array(
				'edit_post'          => MDS_CAREERS_CAP,
				'edit_posts'         => MDS_CAREERS_CAP,
				'edit_others_posts'  => MDS_CAREERS_CAP,
				'publish_posts'      => MDS_CAREERS_CAP,
				'read_post'          => MDS_CAREERS_CAP,
				'read_private_posts' => MDS_CAREERS_CAP,
				'delete_post'        => MDS_CAREERS_CAP,
			),
		) );
	}

	public function register_meta() {
		foreach ( self::META_FIELDS as $key => $type ) {
			register_post_meta( self::POST_TYPE, $key, array(
				'type'          => 'integer' === $type ? 'integer' : 'string',
				'single'        => true,
				'show_in_rest'  => false,
				'auth_callback' => function () {
					return current_user_can( MDS_CAREERS_CAP );
				},
			) );
		}
	}

	public function add_meta_box() {
		add_meta_box(
			'mds_job_details',
			'Job details',
			array( $this, 'render_meta_box' ),
			self::POST_TYPE,
			'normal',
			'high'
		);
	}

	private function meta( $post_id, $key, $default = '' ) {
		$value = get_post_meta( $post_id, $key, true );
		return '' === $value || null === $value ? $default : $value;
	}

	public function render_meta_box( $post ) {
		wp_nonce_field( 'mds_job_save', 'mds_job_nonce' );
		$m = fn( $key, $default = '' ) => esc_attr( $this->meta( $post->ID, $key, $default ) );
		$text = fn( $key, $default = '' ) => esc_textarea( $this->meta( $post->ID, $key, $default ) );
		$status = $this->meta( $post->ID, '_mds_status', 'draft' );
		$type   = $this->meta( $post->ID, '_mds_employment_type', '' );
		?>
		<style>
			.mds-field { margin-bottom: 16px; }
			.mds-field label { display: block; font-weight: 600; margin-bottom: 4px; }
			.mds-field input[type=text], .mds-field input[type=number], .mds-field input[type=date],
			.mds-field select, .mds-field textarea { width: 100%; max-width: 560px; }
			.mds-row { display: flex; gap: 24px; flex-wrap: wrap; }
			.mds-row .mds-field { flex: 1 1 240px; }
			.mds-hint { color: #646970; font-size: 12px; margin-top: 4px; }
		</style>
		<div class="mds-row">
			<div class="mds-field">
				<label for="mds_status">Job status *</label>
				<select name="mds_status" id="mds_status">
					<?php foreach ( self::STATUSES as $key => $label ) : ?>
						<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $status, $key ); ?>><?php echo esc_html( $label ); ?></option>
					<?php endforeach; ?>
				</select>
				<p class="mds-hint">Controls what the public site shows — separate from this screen's own Publish button above.</p>
			</div>
			<div class="mds-field">
				<label for="mds_employment_type">Employment type *</label>
				<select name="mds_employment_type" id="mds_employment_type">
					<option value="">— Select —</option>
					<?php foreach ( self::EMPLOYMENT_TYPES as $key => $label ) : ?>
						<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $type, $key ); ?>><?php echo esc_html( $label ); ?></option>
					<?php endforeach; ?>
				</select>
				<p class="mds-hint">Required before this job can be published.</p>
			</div>
		</div>
		<div class="mds-row">
			<div class="mds-field">
				<label for="mds_vacancies">Vacancies *</label>
				<input type="number" min="0" step="1" name="mds_vacancies" id="mds_vacancies" value="<?php echo $m( '_mds_vacancies', '1' ); ?>">
			</div>
			<div class="mds-field">
				<label for="mds_experience_required">Experience required *</label>
				<input type="text" name="mds_experience_required" id="mds_experience_required" value="<?php echo $m( '_mds_experience_required' ); ?>" placeholder="e.g. 1+ year, Fresher – 1 year">
			</div>
			<div class="mds-field">
				<label for="mds_application_deadline">Application deadline</label>
				<input type="date" name="mds_application_deadline" id="mds_application_deadline" value="<?php echo $m( '_mds_application_deadline' ); ?>">
				<p class="mds-hint">Leave blank for no deadline.</p>
			</div>
		</div>
		<div class="mds-row">
			<div class="mds-field">
				<label for="mds_category">Category</label>
				<input type="text" name="mds_category" id="mds_category" value="<?php echo $m( '_mds_category' ); ?>" placeholder="e.g. Social Media">
			</div>
			<div class="mds-field">
				<label for="mds_location">Location</label>
				<input type="text" name="mds_location" id="mds_location" value="<?php echo $m( '_mds_location' ); ?>" placeholder="e.g. Nagpur">
			</div>
			<div class="mds-field">
				<label for="mds_work_arrangement">Work arrangement</label>
				<input type="text" name="mds_work_arrangement" id="mds_work_arrangement" value="<?php echo $m( '_mds_work_arrangement' ); ?>" placeholder="e.g. On-site, Hybrid, Remote">
			</div>
		</div>
		<div class="mds-field">
			<label for="mds_summary">Summary</label>
			<textarea name="mds_summary" id="mds_summary" rows="3"><?php echo $text( '_mds_summary' ); ?></textarea>
		</div>
		<div class="mds-field">
			<label for="mds_responsibilities">Responsibilities</label>
			<textarea name="mds_responsibilities" id="mds_responsibilities" rows="4"><?php echo $text( '_mds_responsibilities' ); ?></textarea>
			<p class="mds-hint">One per line.</p>
		</div>
		<div class="mds-field">
			<label for="mds_required_skills">Required skills</label>
			<textarea name="mds_required_skills" id="mds_required_skills" rows="4"><?php echo $text( '_mds_required_skills' ); ?></textarea>
			<p class="mds-hint">One per line.</p>
		</div>
		<div class="mds-field">
			<label for="mds_qualifications">Qualifications</label>
			<textarea name="mds_qualifications" id="mds_qualifications" rows="2"><?php echo $text( '_mds_qualifications' ); ?></textarea>
		</div>
		<div class="mds-field">
			<label for="mds_compensation">Compensation</label>
			<textarea name="mds_compensation" id="mds_compensation" rows="2"><?php echo $text( '_mds_compensation' ); ?></textarea>
			<p class="mds-hint">Only shown publicly when filled in.</p>
		</div>
		<?php
	}

	public function save( $post_id, $post ) {
		if ( ! isset( $_POST['mds_job_nonce'] ) || ! wp_verify_nonce( $_POST['mds_job_nonce'], 'mds_job_save' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( MDS_CAREERS_CAP, $post_id ) ) {
			return;
		}

		$status = isset( $_POST['mds_status'] ) ? sanitize_key( $_POST['mds_status'] ) : 'draft';
		if ( ! array_key_exists( $status, self::STATUSES ) ) {
			$status = 'draft';
		}
		$type = isset( $_POST['mds_employment_type'] ) ? sanitize_key( $_POST['mds_employment_type'] ) : '';
		if ( '' !== $type && ! array_key_exists( $type, self::EMPLOYMENT_TYPES ) ) {
			$type = '';
		}
		// A job can't go public without an employment type (spec: never
		// guess it) — silently fall back to draft rather than publish an
		// incomplete listing.
		if ( 'published' === $status && '' === $type ) {
			$status = 'draft';
		}

		$deadline = isset( $_POST['mds_application_deadline'] ) ? sanitize_text_field( $_POST['mds_application_deadline'] ) : '';
		if ( '' !== $deadline && ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $deadline ) ) {
			$deadline = '';
		}

		update_post_meta( $post_id, '_mds_status', $status );
		update_post_meta( $post_id, '_mds_employment_type', $type );
		update_post_meta( $post_id, '_mds_vacancies', max( 0, (int) ( $_POST['mds_vacancies'] ?? 0 ) ) );
		update_post_meta( $post_id, '_mds_experience_required', sanitize_text_field( $_POST['mds_experience_required'] ?? '' ) );
		update_post_meta( $post_id, '_mds_application_deadline', $deadline );
		update_post_meta( $post_id, '_mds_category', sanitize_text_field( $_POST['mds_category'] ?? '' ) );
		update_post_meta( $post_id, '_mds_location', sanitize_text_field( $_POST['mds_location'] ?? '' ) );
		update_post_meta( $post_id, '_mds_work_arrangement', sanitize_text_field( $_POST['mds_work_arrangement'] ?? '' ) );
		update_post_meta( $post_id, '_mds_summary', sanitize_textarea_field( $_POST['mds_summary'] ?? '' ) );
		update_post_meta( $post_id, '_mds_responsibilities', sanitize_textarea_field( $_POST['mds_responsibilities'] ?? '' ) );
		update_post_meta( $post_id, '_mds_required_skills', sanitize_textarea_field( $_POST['mds_required_skills'] ?? '' ) );
		update_post_meta( $post_id, '_mds_qualifications', sanitize_textarea_field( $_POST['mds_qualifications'] ?? '' ) );
		update_post_meta( $post_id, '_mds_compensation', sanitize_textarea_field( $_POST['mds_compensation'] ?? '' ) );
	}

	public function columns( $columns ) {
		$new = array();
		foreach ( $columns as $key => $label ) {
			$new[ $key ] = $label;
			if ( 'title' === $key ) {
				$new['mds_status']     = 'Status';
				$new['mds_type']       = 'Employment type';
				$new['mds_vacancies']  = 'Vacancies';
				$new['mds_deadline']   = 'Deadline';
			}
		}
		return $new;
	}

	public function render_column( $column, $post_id ) {
		switch ( $column ) {
			case 'mds_status':
				$status = $this->meta( $post_id, '_mds_status', 'draft' );
				echo esc_html( self::STATUSES[ $status ] ?? $status );
				break;
			case 'mds_type':
				$type = $this->meta( $post_id, '_mds_employment_type', '' );
				echo esc_html( $type ? ( self::EMPLOYMENT_TYPES[ $type ] ?? $type ) : '—' );
				break;
			case 'mds_vacancies':
				echo esc_html( $this->meta( $post_id, '_mds_vacancies', '0' ) );
				break;
			case 'mds_deadline':
				echo esc_html( $this->meta( $post_id, '_mds_application_deadline', '—' ) ?: '—' );
				break;
		}
	}

	public function status_filter_dropdown( $post_type ) {
		if ( self::POST_TYPE !== $post_type ) {
			return;
		}
		$current = $_GET['mds_status_filter'] ?? '';
		echo '<select name="mds_status_filter"><option value="">All statuses</option>';
		foreach ( self::STATUSES as $key => $label ) {
			printf(
				'<option value="%s"%s>%s</option>',
				esc_attr( $key ),
				selected( $current, $key, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	public function apply_status_filter( $query ) {
		if ( ! is_admin() || ! $query->is_main_query() || self::POST_TYPE !== $query->get( 'post_type' ) ) {
			return;
		}
		if ( ! empty( $_GET['mds_status_filter'] ) ) {
			$query->set( 'meta_key', '_mds_status' );
			$query->set( 'meta_value', sanitize_key( $_GET['mds_status_filter'] ) );
		}
	}

	/** Normalized job array for the public REST route (class-rest-routes.php). */
	public static function to_array( WP_Post $post ) {
		$get = fn( $key ) => get_post_meta( $post->ID, $key, true );
		$lines = fn( $value ) => array_values( array_filter( array_map( 'trim', explode( "\n", (string) $value ) ) ) );
		return array(
			'id'                   => (string) $post->ID,
			'slug'                 => $post->post_name,
			'title'                => get_the_title( $post ),
			'vacancies'            => (int) $get( '_mds_vacancies' ),
			'experienceRequired'   => (string) $get( '_mds_experience_required' ),
			'employmentType'       => $get( '_mds_employment_type' ) ?: null,
			'status'               => $get( '_mds_status' ) ?: 'draft',
			'category'             => $get( '_mds_category' ) ?: null,
			'location'             => $get( '_mds_location' ) ?: null,
			'workArrangement'      => $get( '_mds_work_arrangement' ) ?: null,
			'summary'              => $get( '_mds_summary' ) ?: null,
			'responsibilities'     => $lines( $get( '_mds_responsibilities' ) ),
			'requiredSkills'       => $lines( $get( '_mds_required_skills' ) ),
			'qualifications'       => $get( '_mds_qualifications' ) ?: null,
			'compensation'         => $get( '_mds_compensation' ) ?: null,
			'applicationDeadline'  => $get( '_mds_application_deadline' ) ?: null,
			'modified'             => mysql_to_rfc3339( $post->post_modified_gmt ),
		);
	}
}
