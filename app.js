const dotenv = require('dotenv');
dotenv.config();
const { App, ExpressReceiver } = require('@slack/bolt');

const {
  getProjectManager,
  getUserProjects,
  getProjectsByManager,
  userIds,
} = require('./projects.js');

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

// expressReceiverから、expressアプリを直接操作出来る
expressReceiver.app.get('/', (req, res) => {
  res.send('Slack Bot is running!');
});

// ヘルスチェック用のエンドポイント
expressReceiver.app.get('/health', (req, res) => {
  // HEADリクエストの場合はボディを自動的に空にして返す。
  // ステータスコードとヘッダーのみが返される。
  res
    .status(200)
    .set('X-Health-Status', 'ok')
    .set('X-Timestamp', new Date().toISOString())
    .set('Content-Type', 'application/json')
    .send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'The server is running properly. This endpoint is for monitoring services.',
      version: '1.0.0',
    });
});

// UptimeRobotのデフォルトは「HEADリクエスト」のため、動作確認用に明示的に指定
expressReceiver.app.head('/health', (req, res) => {
  res
    .status(200)
    .set('X-Health-Status', 'ok')
    .set('X-Timestamp', new Date().toISOString())
    .set('Content-Type', 'application/json')
    .end(); // bodyなしでレスポンスを終了
});

expressReceiver.app.get('/ping', (req, res) => {
  res.status(200).type('text/plain').send('pong');
});

// デバッグログ付きヘルスチェックエンドポイント
expressReceiver.app.all('/health-debug', (req, res) => {
  // リクエストの詳細をログ出力
  console.log('Health check request received:');
  console.log('- Method:', req.method);
  console.log('- Headers:', JSON.stringify(req.headers, null, 2));
  console.log('- Body:', req.body);
  console.log('- URL:', req.url);
  console.log('- IP:', req.ip);

  // レスポンスを返す
  res
    .status(200)
    .set('X-Health-Status', 'ok')
    .set('X-Monitored-By', 'UptimeRobot')
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Content-Type', 'text/plain')
    .send('OK');
});

// アプリの起動
(async () => {
  await app.start(port);
  console.log(`⚡️ Slackアプリが http://localhost:${port} で起動しました`);
})();
