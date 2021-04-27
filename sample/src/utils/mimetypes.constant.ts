export const MIMETYPES_APPLICATION = [
    // .epub 	Electronic publication (EPUB)
    "application/epub+zip",
    // .gz 	GZip Compressed Archive
    "application/gzip",
    // .jar 	Java Archive (JAR)
    "application/java-archive",
    // .json 	JSON format
    "application/json",
    // .jsonld 	JSON-LD format
    "application/ld+json",
    // .doc 	Microsoft Word
    "application/msword",
    // .bin 	Any kind of binary data
    "application/octet-stream",
    // .ogx 	OGG
    "application/ogg",
    // .pdf 	Adobe Portable Document Format (PDF)
    "application/pdf",
    // .rtf 	Rich Text Format (RTF)
    "application/rtf",
    // .azw 	Amazon Kindle eBook format 
    "application/vnd.amazon.ebook",
    // .mpkg 	Apple Installer Package 
    "application/vnd.apple.installer+xml",
    // .xul 	XUL
    "application/vnd.mozilla.xul+xml",
    // .xls 	Microsoft Excel
    "application/vnd.ms-excel",
    // .eot 	MS Embedded OpenType fonts
    "application/vnd.ms-fontobject",
    // .ppt 	Microsoft PowerPoint
    "application/vnd.ms-powerpoint",
    // .odp 	OpenDocument presentation document 
    "application/vnd.oasis.opendocument.presentation",
    // .ods 	OpenDocument spreadsheet document 
    "application/vnd.oasis.opendocument.spreadsheet",
    // .odt 	OpenDocument text document 
    "application/vnd.oasis.opendocument.text",
    // .pptx 	Microsoft PowerPoint (OpenXML)
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // .xlsx 	Microsoft Excel (OpenXML)
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // .docx 	Microsoft Word (OpenXML)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // .rar 	RAR archive
    "application/vnd.rar",
    // .vsd 	Microsoft Visio
    "application/vnd.visio",
    // .7z 	7-zip archive
    "application/x-7z-compressed",
    // .abw 	AbiWord document
    "application/x-abiword",
    // .bz 	BZip archive
    "application/x-bzip",
    // .bz2 	BZip2 archive
    "application/x-bzip2",
    // .csh 	C-Shell script
    "application/x-csh",
    // .arc 	Archive document (multiple files embedded)
    "application/x-freearc",
    // .php 	Hypertext Preprocessor (Personal Home Page)
    "application/x-httpd-php",
    // .sh 	Bourne shell script
    "application/x-sh",
    // .swf 	Small web format (SWF) or Adobe Flash document
    "application/x-shockwave-flash",
    // .tar 	Tape Archive (TAR)
    "application/x-tar",
    // .xhtml 	XHTML
    "application/xhtml+xml",
    // .xml 	XML  if not readable from casual users (RFC 3023, section 3)
    "application/xml",
    // .zip 	ZIP archive
    "application/zip"
] as const;
export const MIMETYPES_AUDIO = [
    // if it doesn"t contain video,
    "audio/3gpp2",
    // if it doesn"t contain video,
    "audio/3gpp",
    // .aac 	AAC audio
    "audio/aac",
    // .mp3 	MP3 audio
    "audio/mpeg",
    // .opus 	Opus audio
    "audio/opus",
    // .oga 	OGG audio 	
    "audio/ogg",
    // .mid .midi 	Musical Instrument Digital Interface (MIDI)
    "audio/midi",
    "audio/x-midi",
    // .wav 	Waveform Audio Format
    "audio/wav",
    // .weba 	WEBM audio
    "audio/webm"
] as const;
export const MIMETYPES_FONT = [
    // .otf 	OpenType font
    "font/otf",
    // .ttf 	TrueType Font
    "font/ttf",
    // .woff 	Web Open Font Format (WOFF)
    "font/woff",
    // .woff2 	Web Open Font Format (WOFF)
    "font/woff2"
] as const;
export const MIMETYPES_IMAGE = [
    // .bmp 	Windows OS/2 Bitmap Graphics
    "image/bmp",
    // .gif 	Graphics Interchange Format (GIF)
    "image/gif",
    // .jpeg .jpg 	JPEG images
    "image/jpeg",
    // .png 	Portable Network Graphics
    "image/png",
    // .tif .tiff 	Tagged Image File Format (TIFF)
    "image/tiff",
    // .svg 	Scalable Vector Graphics (SVG)
    "image/svg+xml",
    // .ico 	Icon format
    "image/vnd.microsoft.icon",
    // .webp 	WEBP image
    "image/webp"
] as const;
export const MIMETYPES_TEXT = [
    // .ics 	iCalendar format
    "text/calendar",
    // .css 	Cascading Style Sheets (CSS)
    "text/css",
    // .csv 	Comma-separated values (CSV)
    "text/csv",
    // .htm // .html 	HyperText Markup Language (HTML)
    "text/html",
    // .txt 	Text, (generally ASCII or ISO 8859-n)
    "text/plain",
    // .xml if readable from casual users (RFC 3023, section 3)
    "text/xml",
    // .mjs .js 	JavaScript module 
    "text/javascript"
] as const;
export const MIMETYPES_VIDEO = [
    // .3gp 	3GPP audio/video container
    "video/3gpp",
    // .3g2 	3GPP2 audio/video container
    "video/3gpp2",
    // .ts 	MPEG transport stream
    "video/mp2t",
    // .mpeg 	MPEG Video
    "video/mpeg",
    // .webm 	WEBM video
    "video/webm",
    // .ogv 	OGG video 	
    "video/ogg",
    // .avi 	AVI: Audio Video Interleave
    "video/x-msvideo"
] as const;

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 */
export const MIMETYPES = [
    ...MIMETYPES_APPLICATION,
    ...MIMETYPES_AUDIO,
    ...MIMETYPES_FONT,
    ...MIMETYPES_IMAGE,
    ...MIMETYPES_TEXT,
    ...MIMETYPES_VIDEO
] as const;

export type Mimetype = typeof MIMETYPES[number];
