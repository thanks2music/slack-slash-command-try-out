const dotenv = require('dotenv');
dotenv.config();
const { App, ExpressReceiver } = require('@slack/bolt');

const { getProjectManager, getUserProjects, getProjectsByManager, userIds } = require('./projects');

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

// Boltアプリの初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  endpoints: {
    events: '/slack/events',
  },
  logLevel: 'DEBUG',
});

// ポート番号の設定（デフォルト: 3000）
const port = process.env.PORT || 3000;

// スラッシュコマンドのリスナーの設定 - サブコマンド対応
app.command('/ito_project', async ({ command, ack, respond }) => {
  // コマンドを受け取ったことを確認
  await ack();

  try {
    const args = command.text.split(' ');
    const firstArg = args[0]?.toLowerCase();

    // コマンドが空の場合はヘルプを表示
    if (!firstArg) {
      const helpText = `
*使用方法*:
- \`/ito_project [プロジェクト名]\` - プロジェクトの担当者を表示
- \`/ito_project user [@ユーザー名]\` - ユーザーの担当プロジェクトを表示（@ユーザー名省略時は自分）
- \`/ito_project list\` - すべてのプロジェクトと担当者の一覧を表示
- \`/ito_project help\` - このヘルプを表示
      `;
      await respond(helpText);
      return;
    }

    // サブコマンドの処理
    switch (firstArg) {
      // サブコマンド: user - ユーザーの担当プロジェクト表示
      case 'user':
        {
          let userId = args[1]?.trim();

          // ユーザーが指定されていない場合はコマンド実行者のIDを使用
          if (!userId) {
            userId = command.user_id;
          } else if (userId.startsWith('<@') && userId.endsWith('>')) {
            // メンション形式 <@U1234> からIDを抽出
            userId = userId.slice(2, -1);
          }

          const userProjects = getUserProjects(userId);

          if (userProjects.length > 0) {
            const projectList = userProjects.map(p => `• ${p.name} (${p.key})`).join('\n');
            await respond(`<@${userId}> さんの担当プロジェクト一覧:\n\n${projectList}`);
          } else {
            await respond(`<@${userId}> さんの担当プロジェクトはありません。`);
          }
        }
        break;

      // サブコマンド: list - すべてのプロジェクト一覧表示
      case 'list':
        {
          const projectsByManager = getProjectsByManager();
          let response = ':clipboard: *プロジェクト一覧*\n\n';

          for (const [userId, projects] of Object.entries(projectsByManager)) {
            const projectList = projects.map(p => `${p.name}`).join(', ');
            response += `<@${userId}>: ${projectList}\n`;
          }

          await respond(response);
        }
        break;

      // サブコマンド: help - ヘルプ表示
      case 'help':
        {
          const helpText = `
*使用方法*:
- \`/ito_project [プロジェクト名]\` - プロジェクトの担当者を表示
- \`/ito_project user [@ユーザー名]\` - ユーザーの担当プロジェクトを表示（@ユーザー名省略時は自分）
- \`/ito_project list\` - すべてのプロジェクトと担当者の一覧を表示
- \`/ito_project help\` - このヘルプを表示
          `;
          await respond(helpText);
        }
        break;

      // デフォルト: プロジェクト名と解釈して担当者を表示
      default:
        {
          const projectName = firstArg;
          const response = getProjectManager(projectName);

          if (response) {
            await respond(response);
          } else {
            await respond(`プロジェクト "${projectName}" の情報が見つかりません。`);
          }
        }
        break;
    }
  } catch (error) {
    console.error(error);
    await respond('エラーが発生しました。もう一度お試しください。');
  }
});

// エラーハンドラを追加
app.error(error => {
  console.error('Boltアプリケーションエラー:', error);
});

// expressアプリを直接操作
expressReceiver.app.get('/', (req, res) => {
  res.send('Slack Bot is running!');
});

// デバッグ用のエンドポイント
expressReceiver.app.post('/slack-debug', (req, res) => {
  console.log('リクエスト本文:', req.body);
  res.send('Debug endpoint!');
});

// アプリの起動
(async () => {
  await app.start(port);
  console.log(`⚡️ Slackアプリが http://localhost:${port} で起動しました`);
})();
