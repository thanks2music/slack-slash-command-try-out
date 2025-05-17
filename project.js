// プロジェクト名と担当者の対応関係を管理するオブジェクト (RenderやRailwayを試したいので一旦このまま進める)
const projects = {
  bk: {
    name: 'BK',
    manager: 'U07KE47ESMB',
  },
  sk: {
    name: 'SK',
    manager: 'U07KE47ESMB',
  },
  vk: {
    name: 'VK',
    manager: 'U07KE47ESMB',
  },
  yk: {
    name: 'YK',
    manager: 'U07KE47ESMB',
  },
};

// プロジェクト名から担当者情報を取得する関数
function getProjectManager(projectName) {
  const project = projects[projectName.toLowerCase()];
  if (project) {
    return `${project.name}の担当者は、 <@${project.manager}> さんです`;
  }
  return null;
}

export { getProjectManager };
