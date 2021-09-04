{
  // 目標とするレシピをここに書く
  const TARGETS = [
    // { name: '組立指揮システム', num: 4000 },
    // { name: '磁界発生装置', num: 4000 },
    // { name: '熱推進型ロケット', num: 1000 },
    // { name: '原子核パスタ', num: 1000 },
    { name: 'アルクラッド・アルミシート', num: 1000 },
  ]

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

  // あらかじめ資源としておくもの
  const RAWS = ['水']
  const searchTargets = (targets, graph) => {
    const newGraph = {}
    const raws = {}

    // 再帰的に探してグラフに追加する
    const search = (name) => {
      // 探索済みはスキップ
      if (newGraph[name]) return

      // 定義済み、またはmaterial が辿れないものは 資源としたい
      if (RAWS.includes(name) || !graph[name]) {
        raws[name] = true
        return
      }

      newGraph[name] = graph[name]
      graph[name].materials.forEach((oneMatrials) => {
        oneMatrials.forEach((material) => {
          search(material.name)
        })
      })
    }

    targets.forEach((target) => {
      const { name } = target
      search(name)
    })

    newGraph['目標'] = {
      label: '目標',
      speed: '',
      materials: [targets.map(({ name, num }) => ({ name, num }))],
    }
    return { graph: newGraph, raws }
  }

  const MATERIAL_STYLES = ['solid', 'dashed', 'dotted']
  // graph 情報から Graphviz 描画用のdot言語を生成
  const createDotLang = ({ graph, raws }) => {
    const rawDot = Object.keys(raws)
      .map((raw) => `"${raw}" [shape = box]`)
      .join('\n')
    const graphDot = Object.entries(graph)
      .map(([productName, { label, speed, materials }]) => {
        const materialText = materials
          .map((oneMaterials, index) =>
            oneMaterials
              .map(({ name, speed, num }) => {
                const label = num
                  ? `label=${num}`
                  : speed && `label="In: ${speed}"`
                return `"${name}" -> "${productName}" [${label} style=${MATERIAL_STYLES[index]}]`
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

    return `
digraph G {
  graph [pad="0.75", ranksep="1.5", nodesep="0.25"];
  // recipieGraph start
${rawDot}
${graphDot}
  // recipieGraph end
}
`
  }
  const dotLang = createDotLang(searchTargets(TARGETS, graph))

  console.log(dotLang)
  copy(dotLang)
}
