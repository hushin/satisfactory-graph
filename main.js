{
  const zip = (arr, ...args) =>
    arr.map((value, idx) => [value, ...args.map((arr) => arr[idx])])
  const recipieGraph = $$('[rowspan] > a > img')
    .map((icon) => {
      const tr = icon.parentNode.parentNode.parentNode
      const recipieName = tr.innerText.trim()

      if (/代替: バイオ炭|取り出し/.test(recipieName)) return

      const nameTr = tr.nextElementSibling
      const names = [...nameTr.querySelectorAll('a')].map(
        (elm) => elm.innerText
      )
      const [_, ...data] = names
      const materials = data.slice(0, -1)
      const speedsTr =
        tr.nextElementSibling.nextElementSibling.nextElementSibling
      if (!speedsTr) return
      const speeds = [...speedsTr.querySelectorAll('td')].map(
        (elm) => elm.innerText
      )
      const [recipieSpeed, ...matrialSpeeds] = speeds

      // 数字がない場合は無視
      if (!/\d/.test(speeds)) return

      const materialText = zip(materials, matrialSpeeds)
        .map(
          ([name, speed]) =>
            `"${name}" -> "${recipieName}" [label="In: ${speed}"]`
        )
        .join('\n')
      return `${materialText}\n"${recipieName}" [xlabel="Out: ${recipieSpeed}"]\n`
    })
    .filter(Boolean)
    .join('\n')
    .trim()
  const graph = `
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
${recipieGraph}
  // recipieGraph end
}
`
  console.log(graph)
  copy(graph)
}
