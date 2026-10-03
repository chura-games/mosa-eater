# 3D assets

すべてこのプロジェクトで作成したモデル。形状とマテリアルをGLB内に保存しています。

## マップ
- maps/coast.glb：海面（Water）、海底（Seabed）、砂浜（Beach）、砂丘（SandDune）と、遠景の丘・岬（CoastalHills、接触判定なし）のみ。連続した海岸で、陸地は奥の丘まで続きます。
- maps/coast.profile.json：海岸線の位置・曲がり方・砂浜と海底の傾斜。モデル生成、獲物の出現位置、水面の浅瀬・泡の描画で共有します。変更後はモデルを再生成してください。
- maps/coast.layout.json：岩・ヤシ・パラソル・デッキチェア・海上施設の配置。asset、position、任意のscaleとrotation（Y軸のラジアン）を指定。
マップとオブジェクトは別々に読み込みます。砂浜は濡れた砂から乾いた砂へ色が変化します。

## オブジェクト
objects/ に個別モデルを保存します。配置座標はモデル内に焼き込まず、ローカル原点を基準にします。
- mosasaurus.glb：滑らかな胴体、長い吻、薄いヒレ、尾びれ、目、歯を持つモササウルス。背腹の色分けと斑模様は頂点カラーに保存。Tail / Jawはアニメーション用の回転ノード。Flipperで始まる名前のヒレも泳ぎに合わせて動く。
- diver.glb：ウェットスーツ、マスク、空気タンク、ホース、ハーネス、フィンを持つダイバー。
- shark.glb：背腹の色分け、流線形の胴体、厚みのある滑らかな背びれ・第二背びれ・胸びれ・腹びれ・臀びれ・尾びれ、口、目、えらを持つサメ。ヒレ・目・えら・口は胴体の断面から位置を計算して表面に沿わせています。
- boat.glb、patrol.glb：V字船底、窓、手すり、防舷材、船外機を持つ小型船。迎撃艇にはレーダー、警光灯、救命浮環を追加。
- fish.glb、dolphin.glb、turtle.glb：魚、イルカ、ウミガメ。
- swimmer.glb：水着の遊泳者。
- jetski.glb、sailboat.glb、buoy.glb：乗り手付きの水上バイク、帆とキールを持つヨット、灯火付きのブイ。
- ray.glb、seal.glb、jellyfish.glb：エイ、アザラシ、クラゲ。
- kayak.glb、surfer.glb：漕ぎ手付きのカヤック、ボードに乗ったサーファー。
- gull.glb、kelp.glb：景色用のカモメと海藻。
動かすパーツは名前付きの親ノードにまとめています：Tail（左右に振る尾）、TailV（上下に振る尾）、WingL / WingR（羽ばたき）、ArmL / ArmR（腕）、LegL / LegR（脚）。編集・差し替え時も名前と回転の支点を維持してください。ダイバーは泳ぐ姿勢（うつ伏せ）で保存しています。
- rock.glb：不規則な凹凸と色むらを持つ岩。layoutのscaleで大きさを指定。
- palm.glb：曲がった幹、樹皮の節、羽状の葉、実を持つヤシ。原点は幹の根元。
- umbrella.glb、umbrella-orange.glb：湾曲した布と骨組みを持つパラソル。原点は地面。
- lounger.glb：傾いた背もたれと折り畳みフレームを持つデッキチェア。原点は地面。
- platform.glb：鉄骨の脚と筋交い、手すり、タンク、配管、クレーン、はしごを持つ海上施設。原点のY=0は海面。

描画負荷を抑えるため、同じマテリアルの固定部品は結合しています。生物と船の元のパーツ別境界はGLBのextras（読み込み後のuserData.hitboxes）に保存し、接触・捕食判定に使います。モデルを差し替えて形状を変える場合はこの境界も更新するか、hitboxesを削除してメッシュ別の判定に戻してください。

## 動画
load/chura-games-logo.mp4：ローディング画面で再生するスタジオロゴ（1280×720、約10秒、縁は黒）。

## エフェクト
effects/ に保存します。
- bubbles.glb：水中の粒子。Bubblesノード、pointSizeを維持。
- bite-particle.glb：捕食粒子。BiteParticleノードを維持。
- sonar-ring.glb：ソナー。SonarRingノードを維持。

Waterの形状は水平なXZ面で、ゲーム内で頂点を動かして波を作ります。
波の描画は shaders/water.vert と shaders/water.frag に保存したGPUシェーダーで行います。形状の頂点データをCPUで毎フレーム書き直しません。
shaders/sway.glsl はヤシの葉・草・海藻の揺れを頂点シェーダーで描画します。
shaders/marine-light.frag は水中の物体表面の光の揺らぎを描画します。
通常の起動・ビルドではモデルを生成しません。
npm run assets:generateはすべてのモデルと配置JSONを再生成し、編集したファイルを上書きします。
生成コードは scripts/generate-assets.mjs と scripts/models/ にあります。開発サーバー起動中に node scripts/preview-models.cjs でモデル一覧の画像を保存できます。
