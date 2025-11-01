package com.kfood.kfood_be.recipes.service;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Component
public class PromptFactory {

    public String buildRecipePrompt(List<String> ings, Integer timeMax, Integer servings) {
        int T = timeMax == null ? 25 : timeMax;
        String ingredientsList = (ings == null || ings.isEmpty())
                ? "- (재료 없음)"
                : ings.stream().map(i -> "- " + i).collect(Collectors.joining("\n"));

        StringJoiner sj = new StringJoiner("\n\n");

        sj.add("""
[역할]
너는 정량 계량에 엄격한 한국 가정식 셰프 겸 기록가다. 모든 결과를 1인분 기준 수치로 표기한다.
""");

        sj.add("""
[우선순위 규칙]
1) ingredients의 각 항목은 qty(숫자) + unit(허용 단위) + label(표시문구) **필수**.
   - label 형식: "<재료명> <qty> <unit>" (예: "간장 1.5 큰술", "물 1.0 L", "두부 150.0 g")
   - name에는 **재료명만** (숫자/단위 금지)
2) steps 각 문장에 최소 하나의 **숫자+단위** 포함.
3) 임의 재료 추가 금지(예외: 소금·물·식용유), 필요하면 기본치로 보정.
4) servings=1 고정, timeMin은 %d 분 이내.
""".formatted(T));

        sj.add("""
[사용 가능한 재료]
아래 목록만 사용(예외: 소금·물·식용유)
""" + ingredientsList);

        sj.add("""
[단위/변환/기본치]
- 허용 단위: g, ml, 개, 컵(200ml), 큰술(15ml), 작은술(5ml), 꼬집
- 변환: 1컵=200ml, 1큰술=15ml, 1작은술=5ml
- 기본치(1인분): 물/육수 250ml, 기름 0.5~1큰술, 간장 1.5~2큰술, 고춧가루 0.5~1큰술,
  설탕 1작은술, 다진마늘 1작은술, 참기름 0.5큰술, 소금 0.3~0.5작은술, 후추 0.2작은술,
  고기 120~150g, 면 100~120g, 떡 120g, 어묵 80g, 양파/감자/대파 50~100g
""");

        sj.add("""
[출력 형식(JSON only)]
{
  "title": "요리 이름",
  "category": "탕|볶음|구이|조림|국|전|밥|면|기타",
  "timeMin": number,
  "servings": 1,
  "difficulty": "초급|중급|고급",
  "ingredients": [
    {"name":"재료명","qty":number,"unit":"g|ml|개|컵|큰술|작은술|꼬집","label":"<재료명> <qty> <unit>"}
  ],
  "steps": [{"order": number, "text": "정확 수치 포함"}],
  "chefNote": "조언",
  "tip": "실패 방지 팁"
}
""");

        sj.add("""
[자체 검증]
- ingredients 전 항목에 qty/unit/label 존재?
- steps 각 문장 숫자+단위 포함?
- servings=1? 금지어 없음?
실패 시 즉시 보정 후 완전 JSON만 출력.
""");

        return sj.toString();
    }
}
