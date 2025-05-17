const dotenv = require('dotenv');
const { App, ExpressReceiver } = require('@slack/bolt');
const { getProjectManager } = require('./project');
dotenv.config();

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
    // Slackからのイベントを受け取るパス
    events: '/slack/events',
  },
  // 詳細なログを有効化
  logLevel: 'DEBUG',
});

// ポート番号の設定（デフォルト: 3000）
const port = process.env.PORT || 3000;

// スラッシュコマンドのリスナーの設定
app.command('/ito_project', async ({ command, ack, say }) => {
  // コマンドを受け取ったことを確認
  await ack();

  try {
    // コマンドの引数を取得
    const args = command.text.split(' ');
    const projectName = args[0].toLowerCase();

    if (!projectName) {
      await say('プロジェクト名を指定してください。例: `/ito_project bk`');
      return;
    }

    // プロジェクト名に対応する担当者情報を取得
    const response = getProjectManager(projectName);

    if (response) {
      await say(response);
    } else {
      await say(`プロジェクト "${projectName}" の情報が見つかりません。`);
    }
  } catch (error) {
    console.error(error);
    await say('エラーが発生しました。もう一度お試しください。');
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
