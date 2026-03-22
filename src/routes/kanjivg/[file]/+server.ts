import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { file } = params;
	if (!file.endsWith('.svg')) error(400, 'Invalid file');

	const { rows } = await db.query('SELECT svg_content FROM kanji WHERE svg_file = $1', [file]);
	if (rows.length === 0 || !rows[0].svg_content) error(404, 'SVG not found');

	return new Response(rows[0].svg_content, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};
