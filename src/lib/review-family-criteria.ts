/** DD-1823 부록 A. 학부모용 문안은 기관의 채점 구간·감점표와 별도로 관리합니다. */
export const familyCriteria = [
  {id: "accuracy", area: "내용 요약", number: "①", name: "요약의 정확성", max: 10, lower: "요약한 내용이 책 내용과 일치하는가? 오류는 없는가?"},
  {id: "sufficiency", area: "내용 요약", number: "②", name: "요약의 충분성", max: 20, lower: "책에서 중요한 사건이나 정보를 골라 충분히 요약했는가?\n요약한 내용이 흐름에 따라 자연스럽게 이어지는가?", upper: "책에서 중요한 사건이나 정보를 골라 충분히 요약했는가?\n요약한 내용이 이야기의 구조나 글의 짜임에 따라 자연스럽게 이어지는가?"},
  {id: "specific", area: "감상과 깨달음", number: "③", name: "감상의 구체성", max: 20, lower: "형식적이고 막연한 반응에 그치지 않고 자신만의 생각을 구체적으로 서술했는가?\n자신의 경험·지식을 바탕으로 책 내용에 대한 생각을 확장하여 서술했는가?"},
  {id: "original", area: "발상과 독창성", number: "④", name: "발상의 창의성", max: 20, lower: "책 내용에 대한 창의적인 생각을 담아 서술했는가?", upper: "책 내용에 대한 창의적인 생각을 담아 서술했는가?\n창의적인 발상을 바탕으로 자신만의 결론을 이끌어 냈는가?"},
  {id: "unity", area: "구성과 조직력", number: "⑤", name: "논리성", max: 10, lower: "자신의 생각을 적절한 이유와 근거를 들어 논리적으로 전개했는가?"},
  {id: "cohesion", area: "구성과 조직력", number: "⑥", name: "구성력", max: 10, lower: "글의 앞뒤 내용이 서로 어긋나지 않게 서술했는가?\n문장이 접속어·지시어 등의 연결 장치를 통해 서로 자연스럽게 이어지는가?", upper: "글 전체가 하나의 중심 생각을 향하고, 처음-중간-끝의 구조를 갖추었는가?\n문장과 문단이 접속어·지시어 등의 연결 장치를 통해 서로 자연스럽게 이어지는가?"},
  {id: "expression", area: "표현력", number: "⑦", name: "표현의 정확성", max: 5, lower: "맞춤법·띄어쓰기·문장 부호 등의 오류 없이 정확하게 서술했는가?"},
  {id: "delivery", area: "표현력", number: "⑧", name: "문장력", max: 5, lower: "어색하거나 헷갈리는 문장 없이 뜻이 분명하게 전달되도록 서술했는가?"}
]

export function familyCriteriaForBook(level: number) {
  return familyCriteria.map(criterion => ({ ...criterion, description: level >= 4 && criterion.upper ? criterion.upper : criterion.lower }))
}
