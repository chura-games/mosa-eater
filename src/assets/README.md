# 3D assets

すべてこのプロジェクトで作成した低ポリゴンのモデル。形状とマテリアルをGLB内に保存しています。

## マップ
- maps/coast.glb：海面（Water）、海底（Seabed）、砂浜（Beach）、砂丘（SandDune）のみ。
- maps/coast.layout.json：岩・ヤシ・パラソル・海上施設の配置。asset、position、任意のscaleを指定。
マップとオブジェクトは別々に読み込みます。砂浜の色は砂色です。

## オブジェクト
objects/ に個別モデルを保存します。配置座標はモデル内に焼き込まず、ローカル原点を基準にします。
- mosasaurus.glb：モササウルス。Tail / Jawはアニメーション用の回転ノード。
- diver.glb、shark.glb、boat.glb、patrol.glb：ダイバー、サメ、小型船、迎撃艇。
- rock.glb：岩。layoutのscaleで大きさを指定。
- palm.glb：ヤシ。原点は幹の根元。
- umbrella.glb、umbrella-orange.glb：パラソル。原点は地面。
- platform.glb：海上施設。原点のY=0は海面。

## エフェクト
effects/ に保存します。
- bubbles.glb：水中の粒子。Bubblesノード、pointSizeを維持。
- bite-particle.glb：捕食粒子。BiteParticleノードを維持。
- sonar-ring.glb：ソナー。SonarRingノードを維持。

Waterの形状は水平なXZ面で、ゲーム内で頂点を動かして波を作ります。
通常の起動・ビルドではモデルを生成しません。
npm run assets:generateはすべてのモデルと配置JSONを再生成し、編集したファイルを上書きします。