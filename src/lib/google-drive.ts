import { google } from "googleapis";
import type { ProjectSnapshot } from "@/types/shotflow";

export function getDriveClient(accessToken?: string) {
  if (!accessToken) {
    throw new Error("Google Drive access token is required.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function saveProjectToDrive(project: ProjectSnapshot, accessToken: string, fileId?: string) {
  const drive = getDriveClient(accessToken);
  const media = {
    mimeType: "application/json",
    body: JSON.stringify(project, null, 2)
  };

  if (fileId) {
    const response = await drive.files.update({
      fileId,
      media,
      requestBody: {
        name: `${project.title}.ds-shotflow.json`,
        mimeType: "application/json"
      },
      fields: "id, name, modifiedTime, webViewLink"
    });
    return response.data;
  }

  const response = await drive.files.create({
    media,
    requestBody: {
      name: `${project.title}.ds-shotflow.json`,
      mimeType: "application/json"
    },
    fields: "id, name, modifiedTime, webViewLink"
  });

  return response.data;
}

export async function loadProjectFromDrive(accessToken: string, fileId: string) {
  const drive = getDriveClient(accessToken);
  const response = await drive.files.get(
    {
      fileId,
      alt: "media"
    },
    {
      responseType: "json"
    }
  );

  return response.data as ProjectSnapshot;
}
