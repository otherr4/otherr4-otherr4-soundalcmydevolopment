import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure the upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'usersproflesphotos');
    await mkdir(uploadDir, { recursive: true });

    // Parse the incoming form data
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      filter: ({ mimetype }) => {
        return mimetype ? mimetype.includes('image/') : false;
      },
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.image as formidable.File;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get the desired filename from the form fields
    const fileName = fields.fileName as string;
    if (!fileName) {
      return res.status(400).json({ error: 'No filename provided' });
    }

    // Read the uploaded file
    const fileData = await readFile(file.filepath);

    // Create the new file path
    const newPath = path.join(uploadDir, fileName);

    // Write the file to the new location
    await writeFile(newPath, fileData);

    // Clean up the temporary file
    await fs.promises.unlink(file.filepath);

    // Return the relative path that can be used in the frontend
    const relativePath = `/usersproflesphotos/${fileName}`;

    return res.status(200).json({ 
      success: true, 
      path: relativePath 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error uploading file' 
    });
  }
} 