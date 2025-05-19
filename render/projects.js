const fs = require('fs');
const path = require('path');

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
 * ユーザーID定数へのアクセサ
 * コード内で userIds.NAME のようにアクセス
 */
exports.userIds = userIds;

/**
 * プロジェクト名から担当者情報を取得
 */
exports.getProjectManager = function (projectName) {
  const project = projectsData[projectName.toLowerCase()];
  if (project) {
    return `${project.name}の担当者は、 <@${project.manager}> さんです`;
  }
  return null;
};

/**
 * ユーザーIDが担当するプロジェクト一覧を取得
 */
exports.getUserProjects = function (userId) {
  // ユーザーが担当するプロジェクトをフィルタリング
  const userProjects = Object.entries(projectsData)
    .filter(([_, project]) => project.manager === userId)
    .map(([key, project]) => ({ key, name: project.name }));

  return userProjects;
};

/**
 * すべてのプロジェクト情報を取得
 */
exports.getAllProjects = function () {
  return projectsData;
};

/**
 * プロジェクト担当者のグループ化されたマップを取得
 * 戻り値: { userId1: [project1, project2], userId2: [...] }
 */
exports.getProjectsByManager = function () {
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
};
