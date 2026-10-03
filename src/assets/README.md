# 3D assets

すべてこのプロジェクトで作成した低ポリゴンのモデル。外部モデルの使用はありません。

| ファイル | オブジェクト |
| --- | --- |
| mosasaurus.glb | モササウルス（尾・顎の可動ノード付き） |
| diver.glb | ダイバー |
| shark.glb | サメ |
| boat.glb | 小型船 |
| patrol.glb | 迎撃艇 |
| environment.glb | 海面・海底・岩・島・ヤシ・パラソル・海上施設・水中の粒子 |
| bite-particle.glb | 捕食エフェクトの粒子 |
| sonar-ring.glb | ソナーの輪 |

- glTF 2.0 binary形式。形状とマテリアルをファイル内に格納。
- `Tail` / `Jaw` の親ノードをゲームから回転してアニメーション。
- 環境は `Water` / `Seabed` / `Beach` / `Platform` / `Bubbles` などのパーツとして編集可能。`Water` と `Bubbles` の名前は維持する。
- `Water` の形状は水平なXZ面。波はゲーム内で頂点を動かす。`Bubbles` の `pointSize` はglTF extras内に保存。
- エフェクトは `BiteParticle` / `SonarRing` の名前と基準形状を維持する。
- モデル編集・再生成の手順はルートのREADME.mdを参照。
