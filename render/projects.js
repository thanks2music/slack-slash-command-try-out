// ES Module形式のimport
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirnameの代替（ES Moduleでは__dirnameが使えないため）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * JSONデータを取得する関数（ファイル優先、環境変数にフォールバック）
 */
function getJsonData(filename, envVarName) {
  try {
    // 1. まずファイルから読み込みを試みる
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
      console.log(`${filename} ファイルからデータを読み込みました`);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }

    // 2. ファイルがなければ環境変数を確認
    if (process.env[envVarName]) {
      console.log(`環境変数 ${envVarName} からデータを読み込みました`);
      return JSON.parse(process.env[envVarName]);
    }

    // 3. どちらも見つからない場合は警告を表示
    console.warn(
      `${filename} ファイルも環境変数 ${envVarName} も見つかりません。空のオブジェクトを使用します。`,
    );
    return {};
  } catch (error) {
    console.error(`データの読み込みに失敗しました (${filename} または ${envVarName}):`, error);
    return {};
  }
}

// プロジェクトデータとユーザーIDを読み込む
const projectsData = getJsonData('.project.json', 'PROJECTS_JSON');
const userIds = getJsonData('.user_ids.json', 'USER_IDS_JSON');

/**
 * Slackのメンション文字列からユーザーIDを抽出
 * @param {string} text - ユーザー指定文字列（メンションまたはIDそのもの）
 * @returns {string|null} ユーザーID
 */
function extractUserId(text) {
  if (!text) return null;

  // すでにIDの形式であれば、そのまま返す
  if (/^U[A-Z0-9]{8,}$/.test(text)) {
    return text;
  }

  // メンション形式 (<@U1234>) または (<@U1234|ユーザー名>) からIDを抽出
  const mentionMatch = text.match(/<@([A-Z0-9]{8,})(?:\|.+)?>/);
  if (mentionMatch) {
    return mentionMatch[1]; // 最初のキャプチャグループを返す
  }

  return null;
}

/**
 * プロジェクト名から担当者情報を取得
 */
function getProjectManager(projectName) {
  const project = projectsData[projectName.toLowerCase()];
  if (!project) return null;

  // 担当者が複数いる場合、全員をメンションする
  if (Array.isArray(project.managers) && project.managers.length > 0) {
    if (project.managers.length === 1) {
      return `${project.name}の担当者は、 <@${project.managers[0]}> さんです`;
    } else {
      const mentionList = project.managers.map(id => `<@${id}>`).join('さん、');
      return `${project.name}の担当者は、 ${mentionList}さん です`;
    }
  }

  // 後方互換性のため、古い形式もサポート
  if (project.manager) {
    return `${project.name}の担当者は、 <@${project.manager}> さんです`;
  }

  return `${project.name}の担当者情報がありません`;
}

/**
 * ユーザーIDが担当するプロジェクト一覧を取得
 */
function getUserProjects(userId) {
  if (!userId) return [];

  // ユーザーが担当するプロジェクトをフィルタリング
  const userProjects = Object.entries(projectsData)
    .filter(([_, project]) => {
      // managers配列にユーザーIDが含まれているか確認
      if (Array.isArray(project.managers)) {
        return project.managers.includes(userId);
      }
      // 後方互換性のため、古い形式もサポート
      return project.manager === userId;
    })
    .map(([key, project]) => ({ key, name: project.name }));

  return userProjects;
}

/**
 * すべてのプロジェクト情報を取得
 */
function getAllProjects() {
  return projectsData;
}

/**
 * プロジェクト担当者のグループ化されたマップを取得
 * 戻り値: { userId1: [project1, project2], userId2: [...] }
 */
function getProjectsByManager() {
  const result = {};

  // プロジェクトをループしてユーザーごとにグループ化
  Object.entries(projectsData).forEach(([key, project]) => {
    // 複数担当者の場合
    if (Array.isArray(project.managers)) {
      project.managers.forEach(managerId => {
        if (!result[managerId]) {
          result[managerId] = [];
        }

        result[managerId].push({
          key,
          name: project.name,
        });
      });
    }
    // 後方互換性のため、古い形式もサポート
    else if (project.manager) {
      const managerId = project.manager;
      if (!result[managerId]) {
        result[managerId] = [];
      }

      result[managerId].push({
        key,
        name: project.name,
      });
    }
  });

  return result;
}

// Common.jsから、ES Module形式のエクスポートに変更
export {
  userIds,
  getProjectManager,
  getUserProjects,
  getAllProjects,
  getProjectsByManager,
  extractUserId,
};
