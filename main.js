{
  const getRangeInnerText = (nodeList, start, end) =>
    nodeList
      .slice(start, end)
      .map((elm) => elm.innerText)
      .filter(Boolean)

  const zip = (arr, ...args) =>
    arr.map((value, idx) => [value, ...args.map((arr) => arr[idx])])

  const createItems = (names, speeds) =>
    zip(names, speeds).map(([name, speed]) => ({ name, speed }))

  const MAX_PRODUCTS_NUM = 2 // 最大製作アイテム数
  const MAX_MATERIALS_NUM = 4 // 最大素材数

  const parseRecipies = () =>
    $$('[rowspan] > a > img')
      .map((icon) => {
        const tr = icon.parentNode.parentNode.parentNode
        const recipieTitle = tr.innerText.trim()

        // ややこしいレシピを除外
        if (/^代替:|取り出し$/.test(recipieTitle)) return

        const nameTr = tr.nextElementSibling
        const speedsTr = nameTr.nextElementSibling.nextElementSibling
        if (!speedsTr) return

        const names = [...nameTr.querySelectorAll('td')]
        const productNames = getRangeInnerText(names, 0, MAX_PRODUCTS_NUM)
        const materialNames = getRangeInnerText(
          names,
          MAX_PRODUCTS_NUM,
          MAX_PRODUCTS_NUM + MAX_MATERIALS_NUM
        )

        const productsNum = productNames.length
        const materialsNum = materialNames.length

        const speeds = [...speedsTr.querySelectorAll('td')]
        const productSpeeds = getRangeInnerText(speeds, 0, productsNum)
        const materialSpeeds = getRangeInnerText(
          speeds,
          productsNum,
          productsNum + materialsNum
        )
        // 数字がない場合は自動化できないので無視
        if (!/\d/.test(productSpeeds)) return

        return {
          products: createItems(productNames, productSpeeds),
          materials: createItems(materialNames, materialSpeeds),
        }
      })
      .filter(Boolean)
      .flat()

  const recipies = parseRecipies()
  // console.log(JSON.stringify(recipies, null, 2))

  let dummyCount = 1
  const getDummyNode = () => {
    return `node${dummyCount++}`
  }

  // レシピ、素材の有向グラフっぽいもの を作る
  const createRecipieGraph = (recipies) => {
    /**
     * こういうobjectがvalueに入るグラフ
     * label: string
     * speed: string
     * materials: [[{name, speed}]] 1階層目は OR, 2階層目は AND のイメージ
     */
    const graph = {}

    const setProduct = (product, materials) => {
      const already = graph[product.name]
      if (!already) {
        // 存在しなければ普通に代入
        graph[product.name] = {
          label: product.name,
          speed: product.speed,
          materials: [materials],
        }
      } else {
        // 存在するときはspeedを追記, materialsのパターンを追加
        graph[product.name] = {
          label: product.name,
          speed: `${already.speed}, ${product.speed}`,
          materials: [...already.materials, materials],
        }
      }
    }

    recipies.forEach((recipie) => {
      const { products, materials } = recipie

      if (products.length === 1) {
        const product = products[0]
        setProduct(product, materials)
        return
      }

      // 2つ以上製作する場合はダミーのNodeを挟む
      const node = getDummyNode()
      graph[node] = {
        label: '',
        speed: '',
        materials: [materials],
      }
      products.forEach((product) => {
        setProduct(product, [{ name: node, speed: '' }])
      })
    })
    return graph
  }
  const graph = createRecipieGraph(recipies)
  // console.log(graph)

  // TODO 探索
  // material が辿れないものは 資源としたい

  const MATERIAL_STYLES = ['solid', 'dashed', 'dotted']

  // graph 情報から Graphviz 描画用のdot言語を生成
  const createDotLang = (graph) => {
    const dotLang = Object.entries(graph)
      .map(([productName, { label, speed, materials }]) => {
        // TODO 二重配列対応
        const materialText = materials
          .map((oneMaterials, index) =>
            oneMaterials
              .map(({ name, speed }) => {
                const inLabel = speed && `label="In: ${speed}"`
                return `"${name}" -> "${productName}" [${inLabel} style=${MATERIAL_STYLES[index]}]`
              })
              .join('\n')
          )
          .join('\n')

        // dummyのとき表示を変える
        const outputLabelOrStyle = speed
          ? `xlabel="Out: ${speed}"`
          : `shape=circle`
        return `${materialText}\n"${productName}" [label="${label}" ${outputLabelOrStyle}]\n`
      })
      .join('\n')
    // .trim()
    return `
digraph G {
  graph [pad="0.75", ranksep="0.9", nodesep="1.25"];
  "鉄鉱石" [shape = box]
  "銅鉱石" [shape = box]
  "石灰岩" [shape = box]
  "石炭" [shape = box]
  "カテリウム鉱石" [shape = box]
  "未加工石英" [shape = box]
  "硫黄" [shape = box]
  "ボーキサイト" [shape = box]
  "ウラン" [shape = box]
  "原油" [shape = box]
  "水" [shape = box]
  "窒素ガス" [shape = box]
  "葉" [shape = box]
  "花弁" [shape = box]
  "菌糸" [shape = box]
  // recipieGraph start
${dotLang}
  // recipieGraph end
}
`
  }
  const dotLang = createDotLang(graph)

  console.log(dotLang)
}
