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
 * プロジェクト名から担当者情報を取得
 */
function getProjectManager(projectName) {
  const project = projectsData[projectName.toLowerCase()];
  if (project) {
    return `${project.name}の担当者は、 <@${project.manager}> さんです`;
  }
  return null;
}

/**
 * ユーザーIDが担当するプロジェクト一覧を取得
 */
function getUserProjects(userId) {
  // ユーザーが担当するプロジェクトをフィルタリング
  const userProjects = Object.entries(projectsData)
    .filter(([_, project]) => project.manager === userId)
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
    if (!result[project.manager]) {
      result[project.manager] = [];
    }

    result[project.manager].push({
      key,
      name: project.name,
    });
  });

  return result;
}

// ES Module形式のエクスポート
export { userIds, getProjectManager, getUserProjects, getAllProjects, getProjectsByManager };
