<?php
/**
 * Résumé storage: a dedicated, .htaccess-protected directory under
 * wp-content/uploads/ with random non-guessable filenames — never the
 * regular public media library. Downloads are only ever served through
 * an authenticated admin-post.php action gated on MDS_CAREERS_CAP, never
 * a bare public URL. File content is signature-checked (not trusted by
 * filename/MIME) — the same checks the Next.js layer already ran, run
 * again here because the Next.js layer is not a trust boundary either.
 *
 * Assumption to verify once installed: this relies on the web server
 * honoring .htaccess "Deny from all" (true for the LiteSpeed/Apache stack
 * Hostinger uses). If a future host doesn't honor .htaccess, the fallback
 * is to move this directory outside the web root entirely — ask before
 * doing that, since it changes the hosting file layout.
 */

defined( 'ABSPATH' ) || exit;

class MDS_Careers_Resume_Storage {
	const ALLOWED_EXTENSIONS = array( 'pdf', 'doc', 'docx' );
	const MAX_BYTES          = 5 * 1024 * 1024; // 5MB

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_post_mds_download_resume', array( $this, 'handle_download' ) );
	}

	public static function directory() {
		$uploads = wp_upload_dir();
		return trailingslashit( $uploads['basedir'] ) . 'mds-careers-private';
	}

	public static function create_protected_directory() {
		$dir = self::directory();
		if ( ! file_exists( $dir ) ) {
			wp_mkdir_p( $dir );
		}
		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			file_put_contents( $htaccess, "# Deny all direct access — résumés are served only via wp-admin.\n<IfModule mod_authz_core.c>\n\tRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n\tOrder allow,deny\n\tDeny from all\n</IfModule>\n" );
		}
		$index = $dir . '/index.php';
		if ( ! file_exists( $index ) ) {
			file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}
	}

	private static function extension_of( $filename ) {
		return strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );
	}

	private static function signature_matches( $head, $extension ) {
		$is_pdf = 0 === strncmp( $head, "%PDF-", 5 );
		$is_zip = 0 === strncmp( $head, "PK\x03\x04", 4 );
		$is_ole = 0 === strncmp( $head, "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1", 8 );
		if ( 'pdf' === $extension ) {
			return $is_pdf;
		}
		if ( 'docx' === $extension ) {
			return $is_zip;
		}
		if ( 'doc' === $extension ) {
			return $is_ole || $is_zip;
		}
		return false;
	}

	/**
	 * Validates and stores an uploaded résumé from a PHP $_FILES-style array
	 * (that's what WP_REST_Request::get_file_params() returns for a
	 * multipart request). Returns array( path, original_name ) on success
	 * or a WP_Error.
	 */
	public static function store( array $file ) {
		if ( empty( $file['tmp_name'] ) || UPLOAD_ERR_OK !== ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) ) {
			return new WP_Error( 'mds_resume_missing', 'Attach your résumé/CV to continue.' );
		}
		if ( ! is_uploaded_file( $file['tmp_name'] ) ) {
			return new WP_Error( 'mds_resume_invalid', 'Invalid upload.' );
		}
		if ( (int) $file['size'] <= 0 || (int) $file['size'] > self::MAX_BYTES ) {
			return new WP_Error( 'mds_resume_size', 'Résumé must be 5MB or smaller.' );
		}
		$extension = self::extension_of( $file['name'] );
		if ( ! in_array( $extension, self::ALLOWED_EXTENSIONS, true ) ) {
			return new WP_Error( 'mds_resume_type', 'Résumé must be a PDF, DOC or DOCX file.' );
		}
		$handle = fopen( $file['tmp_name'], 'rb' );
		$head   = $handle ? fread( $handle, 8 ) : '';
		if ( $handle ) {
			fclose( $handle );
		}
		if ( ! self::signature_matches( (string) $head, $extension ) ) {
			return new WP_Error( 'mds_resume_signature', "That file doesn't look like a valid PDF/DOC/DOCX." );
		}

		self::create_protected_directory();
		$dir      = self::directory();
		$filename = bin2hex( random_bytes( 16 ) ) . '.' . $extension;
		$dest     = trailingslashit( $dir ) . $filename;

		if ( ! @move_uploaded_file( $file['tmp_name'], $dest ) ) {
			return new WP_Error( 'mds_resume_move', 'Could not store the résumé.' );
		}
		chmod( $dest, 0640 );

		return array(
			'path'          => $filename, // relative to the protected directory only
			'original_name' => sanitize_file_name( $file['name'] ),
		);
	}

	public static function download_url( $application_id ) {
		return wp_nonce_url(
			add_query_arg(
				array( 'action' => 'mds_download_resume', 'id' => (int) $application_id ),
				admin_url( 'admin-post.php' )
			),
			'mds_download_resume_' . (int) $application_id
		);
	}

	public function handle_download() {
		$id = (int) ( $_GET['id'] ?? 0 );
		check_admin_referer( 'mds_download_resume_' . $id );
		if ( ! current_user_can( MDS_CAREERS_CAP ) ) {
			wp_die( 'You do not have permission to download this file.' );
		}
		$app = MDS_Careers_Applications::get( $id );
		if ( ! $app || empty( $app['resume_path'] ) ) {
			wp_die( 'No résumé on file for this application.' );
		}
		// Reject any path trickery outright — resume_path is always a flat
		// filename we generated ourselves, never user input at read time.
		$filename = basename( $app['resume_path'] );
		$path     = trailingslashit( self::directory() ) . $filename;
		if ( ! file_exists( $path ) ) {
			wp_die( 'That résumé file is missing from storage.' );
		}

		nocache_headers();
		header( 'Content-Description: File Transfer' );
		header( 'Content-Type: application/octet-stream' );
		header( 'Content-Disposition: attachment; filename="' . sanitize_file_name( $app['resume_original_name'] ?: $filename ) . '"' );
		header( 'Content-Length: ' . filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $path );
		exit;
	}
}
