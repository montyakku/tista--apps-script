# Event Survey Reminder セットアップ手順

## 前提条件
- SendGridライブラリが既にデプロイされていること
- SendGridでCustom Fieldsが作成されていること:
  - `last_event_attended_at` (Date型)
  - `last_survey_event_date` (Date型)

## 構成
このプロジェクトは2つの独立したApps Scriptプロジェクトに分かれています：

- **Event Registration**: イベント登録処理用
- **Survey Response**: アンケート回答処理用

## 1. イベント登録用 Apps Script設定

### 1-1. プロジェクト作成
1. [Google Apps Script](https://script.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を「Event Registration Handler」に変更

### 1-2. スクリプトファイル追加
1. `event-registration/main.gs`と`event-registration/TestFunctions.gs`の内容をコピー
2. Apps Scriptエディタにファイルを作成・保存

### 1-3. SendGridLibraryの追加
1. 左サイドバーの「ライブラリ」をクリック
2. SendGrid LibraryのスクリプトIDを追加
3. **識別子を「SendGridLibrary」に設定**（重要！）

### 1-4. トリガー設定
1. [イベント登録スプレッドシート](https://docs.google.com/spreadsheets/d/1q3ct70D2kJQsIWzh1hZ59Fq5eCElL5y5dm2OaAnUlWk/edit)を開く
2. 「拡張機能」→「Apps Script」→「Event Registration Handler」プロジェクトを開く
3. トリガーアイコン（時計マーク）→「トリガーを追加」
4. 設定:
   - 実行する関数: `onFormSubmit`
   - イベントのソース: `スプレッドシートから`
   - イベントの種類: `フォーム送信時`

### 1-5. テスト
- `testLibraryConnection()` - ライブラリ接続確認
- `testEventRegistration()` - 機能テスト
- `runAllTests()` - 統合テスト

## 2. アンケート回答用 Apps Script設定

### 2-1. プロジェクト作成
1. [Google Apps Script](https://script.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を「Survey Response Handler」に変更

### 2-2. スクリプトファイル追加
1. `survey-response/main.gs`と`survey-response/TestFunctions.gs`の内容をコピー
2. Apps Scriptエディタにファイルを作成・保存

### 2-3. SendGridLibraryの追加
1. 左サイドバーの「ライブラリ」をクリック
2. SendGrid LibraryのスクリプトIDを追加
3. **識別子を「SendGridLibrary」に設定**（重要！）

### 2-4. トリガー設定
1. [アンケート結果スプレッドシート](https://docs.google.com/spreadsheets/d/1n9wXaGJRRP7MHfs71gAdV9Jyy0s7EmQHCcZyyEc5bwQ/edit)を開く
2. 「拡張機能」→「Apps Script」→「Survey Response Handler」プロジェクトを開く
3. トリガーアイコン（時計マーク）→「トリガーを追加」
4. 設定:
   - 実行する関数: `onFormSubmit`
   - イベントのソース: `スプレッドシートから`
   - イベントの種類: `フォーム送信時`

### 2-5. テスト
- `testLibraryConnection()` - ライブラリ接続確認
- `testSurveyResponse()` - 機能テスト
- `runAllTests()` - 統合テスト

## 3. 本番テスト
1. 実際のGoogle Formsからフォーム送信
2. 各Apps Scriptの実行ログでSendGrid Contactが正しく更新されることを確認

## データ仕様
### イベント登録スプレッドシート
- EMAIL: 2列目
- EVENT_DATE: 4列目
- SendGrid更新フィールド: `last_event_attended_at`

### アンケート結果スプレッドシート
- EMAIL: 2列目
- EVENT_DATE: 3列目
- SendGrid更新フィールド: `last_survey_event_date`

## 注意事項
- 各スプレッドシートに独立したApps Scriptプロジェクトが必要
- SendGridのAPIキーはSendGridLibraryライブラリで一元管理
- テスト用定数は各`TestFunctions.gs`の`TEST_CONFIG`で設定
- トリガー関数名は両方とも`onFormSubmit`で統一