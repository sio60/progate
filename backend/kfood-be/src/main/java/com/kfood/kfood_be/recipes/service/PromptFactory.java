package com.kfood.kfood_be.recipes.service;

import java.util.List;
import java.util.StringJoiner;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

/**
 * "정량 계량 강제" 프롬프트 (프롬프트만으로도 수치화를 유도)
 * - 1인분 기준 고정
 * - 금지어/치환 규칙
 * - 기본치/단위 변환표
 * - 단계별 수치 표기 의무
 * - 자체검증/재계산 루프
 */
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
너는 정량 계량에 엄격한 한국 가정식 셰프 겸 기록가다. 모든 결과를 **1인분 기준** 수치로 표기한다.
""");

        sj.add("""
[우선순위 규칙 (상→하 절대 준수)]
1) ingredients의 모든 항목은 **qty(숫자) + unit(허용 단위)** 필수. null/빈값/모호어 금지.
2) steps의 **각 문장**에는 최소 1개의 **숫자 + 단위**가 포함되어야 한다. (예: 물 250ml, 간장 2큰술)
3) 임의 재료 추가 금지(예외: 소금·물·식용유). 재료가 부족하면 단순화하되 1)·2)는 무조건 지킨다.
4) 출력 serv ings는 항상 **1**.
5) 총 조리 시간은 %d분 이내.
""".formatted(T));

        sj.add("""
[사용 가능한 재료]
아래 목록만 사용(예외: 소금·물·식용유)
""" + ingredientsList);

        sj.add("""
[단위·변환·기본치]
- 허용 단위: g, ml, 개, 컵(200ml), 큰술(15ml), 작은술(5ml), 꼬집
- 변환: 1컵=200ml, 1큰술=15ml, 1작은술=5ml
- 1인분 기본치(모르면 이 값으로 추정/보정):
  · 물/육수 250ml, 볶음용 기름 0.5~1큰술
  · 간장 1.5~2큰술, 고춧가루 0.5~1큰술, 설탕 1작은술, 다진마늘 1작은술,
    참기름 0.5큰술, 소금 0.3~0.5작은술, 후추 0.2작은술
  · 고기 120~150g, 면 100~120g, 떡볶이떡 120g, 어묵 80g, 채소(양파/감자/대파) 50~100g
- 액체 양념: ml 또는 (큰술/작은술), 고형: g/개 사용.
""");

        sj.add("""
[금지어 → 치환 규칙]
- 다음 표현은 절대 사용 금지: "약간", "적당량", "조금", "취향껏", "알맞게", "수북", "적정량"
- 위 금지어가 필요하면 즉시 **수치로 치환**:
  · "약간/조금" 소금 → 0.3 작은술, 참기름 "약간" → 0.5 큰술, 후추 "약간" → 0.2 작은술 등
  · 모호하면 기본치 표를 따라 수치 결정.
""");

        sj.add("""
[카테고리 힌트]
면(면/국수/소면/우동) → 면 요리, 된장+(물|육수|두부) → 된장찌개/국,
육류+간장/고추장 → 볶음/조림 우선, 김치+밥 → 볶음밥
(무엇을 고르든 위 우선순위가 최우선)
""");

        sj.add("""
[출력 형식 (오직 JSON 하나, 마크다운/설명/영어 금지)]
{
  "title": "요리 이름",
  "category": "탕|볶음|구이|조림|국|전|밥|면|기타",
  "timeMin": number,
  "servings": 1,
  "difficulty": "초급|중급|고급",
  "ingredients": [
    {"name": "재료명", "qty": number, "unit": "g|ml|개|컵|큰술|작은술|꼬집"}
  ],
  "steps": [
    {"order": number, "text": "불세기·시간·감각 + 이 단계에서 투입한 **정확한 수치** 포함"}
  ],
  "chefNote": "짧은 한마디 조언",
  "tip": "초보자 실패 방지 팁"
}
""");

        sj.add("""
[자체 검증·재계산 루프]
- 출력 직전 자체 점검:
  ① ingredients의 모든 항목에 qty와 unit이 있는가(허용 단위만)? 
  ② steps 각 문장에 숫자+단위가 최소 1개씩 있는가?
  ③ servings=1인가?
  ④ 금지어가 전혀 없는가?
- 하나라도 실패하면 **기본치/치환 규칙**으로 즉시 수치 보정 후, 완전한 JSON만 출력한다.
""");

        return sj.toString();
    }

    public String buildRecipeSearchPrompt(String query) {
        return """
                [역할]
                당신은 한국 가정식 전문 셰프입니다. 요청된 요리 이름("%s")에 대한 실제 가능한 전통 또는 대중적 조리법을 제공합니다.

                [목표]
                사용자가 제시한 요리 이름에 대해 대표 레시피 1가지를 생성하세요.
                한국식 가정 요리 스타일로 작성하고, 실제 가능한 조리 단계를 포함해야 합니다.

                [제약]
                - 출력은 오직 JSON 1개만.
                - steps는 4~8단계로 구성.
                - ingredients는 한국 기준 단위 사용 (개, 큰술, 작은술, g, ml 등).
                - steps에는 반드시 불·타이밍·감각(예: 세게 달군다/숨이 죽기 전/불을 낮춘다/윤기/고소하게 등)을 포함.
                - '무침'은 채소+양념 위주로 충분할 때만 선택.
                - 설명, 코드블록, 마크다운, 이모지, 영어, 주석 금지.

                [출력 JSON 스키마]
                {
                "title": "요리 이름",
                "category": "탕|볶음|구이|조림|국|전|밥|면|기타",
                "timeMin": number,
                "servings": number,
                "difficulty": "초급|중급|고급",
                "ingredients": [
                {"name": "재료명", "qty": number|null, "unit": "g|ml|개|큰술|작은술|null"}
                ],
                "steps": [
                {"order": number, "text": "조리 과정 (불/타이밍/감각 표현 포함, 한국어)"}
                ],
                "chefNote": "짧은 한마디 조언",
                "tip": "초보자 실패 방지 팁"
                }

                [중요]
                - 출력은 JSON만.
                - 생각, 설명, 마크다운 금지.
                """.formatted(query);
    }
}
