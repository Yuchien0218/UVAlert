# UVAlert 擴充衛教選題研究：搜尋問句與海洋友善

- 研究日期：2026-08-16
- 目的：為六個既定衛教分類各新增 3 篇文章，先提供每類至少 4 個候選題。
- 範圍：只做選題與來源研究，不修改既有文章或程式碼。
- 現有文章基準：`docs/education/articles/` 共 30 篇。

## 研究方法與證據分級

本研究將兩種證據分開，避免把「很多人搜尋」誤當成「內容正確」。

### A. 搜尋趨勢／常見問句線索

1. Google Trends 的 2024–2025 Summer Trends 頁面直接列出防曬相關問句，例如「Are chemical sunscreens safe?」與「Is expired sunscreen still good?」。這可證明問句存在於 Google 的趨勢內容，但不能推出臺灣精確排名或搜尋量。
2. AAD 於近年更新的 Sunscreen FAQs、標籤解讀、噴霧與棒狀防曬教學，反覆以使用者問句整理「物理／化學、高 SPF、維生素 D、嬰幼兒、噴霧／棒狀、潤色防曬、reef safe」等議題，可作為需求線索與專業來源。
3. 2024–2026 中英文搜尋結果中，「防曬順序」「SPF30 vs SPF50」「物理性 vs 化學性」「室內／車內」「孕婦／嬰兒」「防曬會不會缺乏維生素 D」「reef-safe／海洋友善」「tinted mineral sunscreen」反覆出現。本文只將它們視為質性線索，不宣稱精確名次、搜尋量或成長率。
4. Google Trends Explore 頁面可供日後產品團隊依地區、期間、語言實際驗證；在未匯出可重現資料前，不寫「最熱門」「第一名」等敘述。

趨勢線索來源：

- [Google Trends — Summer Trends](https://trends.withgoogle.com/trends/us/summer-trends/)（存取：2026-08-16；限制：美國趨勢頁，不能代表臺灣排名）
- [Google Trends Explore](https://trends.google.com/trends/explore)（存取：2026-08-16；限制：需另設地區、期間與比較詞才能形成可重現結論）
- [AAD — Sunscreen FAQs](https://www.aad.org/media/stats-sunscreen)（近年更新；存取：2026-08-16）
- [AAD — How to decode a sunscreen label](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/understand-sunscreen-labels)（2026 年頁面；存取：2026-08-16）
- [AAD — How to use stick and spray sunscreens](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-use-stick-spray-sunscreens)（2025 年頁面；存取：2026-08-16）

### B. 健康與環境主張來源

文章健康主張以臺灣官方、WHO、FDA、CDC、AAD、NHS 等第一手資料為主。海洋環境主張以海洋保育署、國家海洋研究院、NOAA、EPA 為主。搜尋結果或媒體只能協助選題，不能單獨支持醫療或環境安全結論。

---

## 一、了解今天的 UV（uv-basics）

### 候選 1｜SPF 30、50、50+ 差多少？數字越高就能撐越久嗎？

- 搜尋問句線索：`SPF 30 vs 50`、`SPF50 可以撐多久`、`高係數防曬需要補擦嗎`反覆出現在中英文結果及 AAD FAQ。
- 避免重複：既有文章解釋 SPF／PA 定義，本篇集中處理「高數字的增益有限」與「不能換算可曝曬時間」的決策誤區。
- 可引用主張：AAD 建議 SPF 30 以上；高 SPF 阻擋的 UVB 稍多，但沒有產品能阻擋 100%；高 SPF 不代表能延長補擦間隔。
- 主要來源：[AAD Sunscreen FAQs](https://www.aad.org/media/stats-sunscreen)（近年更新；存取：2026-08-16）、[FDA Sunscreen: How to Help Protect Your Skin](https://www.fda.gov/drugs/understanding-over-counter-medicines/sunscreen-how-help-protect-your-skin-sun)（存取：2026-08-16）。
- 限制：不同國家的最低建議 SPF 不完全相同；成稿應以臺灣產品標示與使用情境為主，不能用美國法規取代臺灣規範。

### 候選 2｜天天防曬會不會影響維生素 D？需要故意曬太陽嗎？

- 搜尋問句線索：`sunscreen vitamin D`、`防曬 維生素D`是 AAD FAQ 與 NHS 防曬頁直接處理的問句。
- 避免重複：現有文章談 UV 傷害與防護，沒有專門回應維生素 D 焦慮。
- 可引用主張：AAD 建議從飲食或強化食品取得維生素 D，不應為取得維生素 D 而增加皮膚癌風險；若擔心不足，應與醫療人員討論。
- 主要來源：[AAD Sunscreen FAQs](https://www.aad.org/media/stats-sunscreen)（存取：2026-08-16）、[NHS Sunscreen and sun safety](https://www.nhs.uk/live-well/seasonal-health/sunscreen-and-sun-safety/)（頁面審閱：2026-03-24；存取：2026-08-16）。
- 限制：不提供個人補充劑劑量；維生素 D 需求與檢驗屬醫療判斷。

### 候選 3｜皮膚比較深、比較不容易曬紅，也需要防曬嗎？

- 搜尋問句線索：`does dark skin need sunscreen`、`黑皮膚需要防曬嗎`長期出現在專業 FAQ。
- 避免重複：既有 UV 基礎文沒有處理膚色與「不曬紅就沒傷害」的誤會。
- 可引用主張：所有膚色都可能受到 UV 傷害並罹患皮膚癌；較深膚色也可能有色素沉著問題。
- 主要來源：[CDC Sun Safety Facts](https://www.cdc.gov/skin-cancer/sun-safety/)（2026 年頁面；存取：2026-08-16）、[AAD The latest in sun protection](https://www.aad.org/news/latest-in-sun-protection)（2022；存取：2026-08-16）。
- 限制：不以膚色推估個人的安全曝曬時間，也不暗示風險完全相同。

### 候選 4｜潤色防曬真的比較能防斑嗎？可見光和 UV 有什麼不同？

- 搜尋問句線索：2025–2026 `tinted mineral sunscreen`、`潤色防曬 防斑`在搜尋與新品討論中顯著常見；AAD 最新標籤頁新增專節。
- 避免重複：既有文章解釋 UVA／UVB，沒有解釋可見光、氧化鐵與潤色防曬。
- 可引用主張：AAD 指出可見光可能加重部分族群的色素沉著；含氧化鐵的潤色廣譜防曬可提供額外可見光防護。
- 主要來源：[AAD How to decode a sunscreen label](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/understand-sunscreen-labels)（2026；存取：2026-08-16）、[AAD How to fade dark spots in darker skin tones](https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots)（近年更新；存取：2026-08-16）。
- 限制：不能寫成所有潤色產品都有相同效果；需看廣譜、SPF 與成分標示，且不是治療色斑。

**本分類優先建議：候選 1、2、4。** 問句清楚、搜尋意圖強，且能補足現有內容。

---

## 二、出門前準備（before-going-out）

### 候選 1｜物理性、化學性、混合型防曬怎麼選？哪一種比較安全？

- 搜尋問句線索：Google Summer Trends 直接列出「Are chemical sunscreens safe?」；AAD FAQ 也以物理／化學差異為核心問句。
- 避免重複：既有選購文著重廣譜、SPF／PA、抗水，本篇聚焦成分類型與「吸收／反射」過度簡化。
- 可引用主張：含氧化鋅或二氧化鈦者通常歸為礦物性；不同類型只要通過當地規範並正確使用都可提供保護；敏感肌可優先考慮較不刺激的配方。
- 主要來源：[AAD Sunscreen FAQs](https://www.aad.org/media/stats-sunscreen)（存取：2026-08-16）、[FDA Sunscreen: How to Help Protect Your Skin](https://www.fda.gov/drugs/understanding-over-counter-medicines/sunscreen-how-help-protect-your-skin-sun)（存取：2026-08-16）。
- 限制：美國核准成分狀態不等於臺灣法規；不得宣稱「天然＝安全」或「化學性＝有毒」。

### 候選 2｜保養、防曬、妝前和底妝，正確順序是什麼？要等多久？

- 搜尋問句線索：`防曬順序`、`sunscreen before or after moisturizer/makeup`是近年中英文搜尋結果的高頻問句形式。
- 避免重複：既有帶妝文章處理外出中補擦，本篇只處理第一次出門前的層疊順序與乾燥時間。
- 可引用主張：防曬應依產品標示，在日曬前足量覆蓋裸露皮膚；彩妝不應取代足量防曬。
- 主要來源：[AAD How to apply sunscreen](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-apply-sunscreen)（存取：2026-08-16）、[FDA Tips to Stay Safe in the Sun](https://www.fda.gov/consumers/consumer-updates/tips-stay-safe-sun-sunscreen-sunglasses)（存取：2026-08-16）。
- 限制：官方來源通常不規定所有保養品間固定等待秒數；成稿應寫「依產品標示、待前一層成膜且不搓泥」，不可捏造通用分鐘數。

### 候選 3｜防曬乳、防曬棒、防曬噴霧哪個好？用量最容易錯在哪？

- 搜尋問句線索：2025 AAD 專門發布棒狀與噴霧使用頁，反映實際問答需求；`sunscreen stick vs lotion`、`spray sunscreen enough`常見。
- 避免重複：既有文章只在帶妝文簡短提醒不要直接噴臉，尚未比較三種劑型。
- 可引用主張：噴霧難確認是否足量，需噴至皮膚有光澤再抹勻，避免吸入、臉口附近與迎風噴；棒狀需多次來回並抹勻。
- 主要來源：[AAD How to use stick and spray sunscreens](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-use-stick-spray-sunscreens)（2025；存取：2026-08-16）、[FDA Sunscreen: How to Help Protect Your Skin](https://www.fda.gov/drugs/understanding-over-counter-medicines/sunscreen-how-help-protect-your-skin-sun)（存取：2026-08-16）。
- 限制：AAD 的「四次來回」屬其教學建議，臺灣產品仍應優先依標示；氣霧罐另有可燃與高溫風險，需核對個別標示。

### 候選 4｜容易長痘、出油或刺痛，防曬要看哪些標示？

- 搜尋問句線索：`sunscreen for acne prone skin`、`防曬 長痘`反覆出現在近年搜尋與產品問答。
- 避免重複：既有刺激反應文處理「已經不舒服」，本篇處理購買前的降低刺激與持續使用策略。
- 可引用主張：油性或易長痘者可留意 non-comedogenic；敏感肌可選無香料、成分較單純並先局部試用；若灼熱刺痛應停用。
- 主要來源：[AAD How to decode a sunscreen label](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/understand-sunscreen-labels)（2026；存取：2026-08-16）、[臺灣 FDA 使用化粧品造成肌膚不適 FAQ](https://www.fda.gov.tw/tc/siteListContent.aspx?id=22059&sid=9096)（維護：2024-06-11；存取：2026-08-16）。
- 限制：`敏感肌`、`低敏`等行銷詞可能沒有一致標準；不能保證不致痘或不過敏。

**本分類優先建議：候選 1、2、3。** 三篇正好覆蓋成分選擇、使用順序與劑型操作。

---

## 三、外出中的補擦（reapply-sunscreen）

### 候選 1｜SPF 50 也要每兩小時補嗎？高係數和補擦頻率無關嗎？

- 搜尋問句線索：`does SPF 50 need reapplication`、`SPF50 多久補擦`是 SPF 搜尋的常見延伸問句。
- 避免重複：既有文章說明一般兩小時規則，本篇以高 SPF 的錯誤安全感為單一焦點，適合搜尋落地頁。
- 可引用主張：高 SPF 不會比低 SPF 維持更久；戶外約每兩小時，且游泳、流汗、擦拭後提早補。
- 主要來源：[AAD Sunscreen FAQs](https://www.aad.org/media/stats-sunscreen)（存取：2026-08-16）、[FDA Tips to Stay Safe in the Sun](https://www.fda.gov/consumers/consumer-updates/tips-stay-safe-sun-sunscreen-sunglasses)（存取：2026-08-16）。
- 限制：避免與主文章大段重複；可設計為短篇「常見誤會拆解」並內鏈完整補擦指南。

### 候選 2｜防曬棒補擦要來回幾次？擦過還要用手抹勻嗎？

- 搜尋問句線索：棒狀防曬近年常見於補妝、攜帶與社群短影音；AAD 2025 年專頁直接回答用量問題。
- 避免重複：現有帶妝補擦文沒有具體教棒狀劑型的覆蓋方法。
- 可引用主張：AAD 建議每個區域來回四次並再抹勻；仍需選廣譜、抗水、SPF 30 以上並依標示補擦。
- 主要來源：[AAD How to use stick and spray sunscreens](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-use-stick-spray-sunscreens)（2025；存取：2026-08-16）。
- 限制：四次是 AAD 的一般操作建議，不是所有產品的法定用量；臉部大小與棒體寬度不同。

### 候選 3｜噴霧防曬怎麼補才夠？可以直接對著臉噴嗎？

- 搜尋問句線索：`how much spray sunscreen`、`防曬噴霧可以噴臉嗎`為常見操作問句。
- 避免重複：現有文章僅一句警語，本篇完整處理戶外有風、吸入風險、覆蓋不足與抹勻。
- 可引用主張：不要在臉或口鼻附近直接噴，也不要迎風噴；先噴到手上再用於臉；皮膚需均勻覆蓋並抹勻。
- 主要來源：[AAD How to use stick and spray sunscreens](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-use-stick-spray-sunscreens)（2025；存取：2026-08-16）、[FDA Sunscreen: How to Help Protect Your Skin](https://www.fda.gov/drugs/understanding-over-counter-medicines/sunscreen-how-help-protect-your-skin-sun)（存取：2026-08-16）。
- 限制：不可把「皮膚發亮」當成精確劑量；需提醒閱讀氣霧罐的可燃、通風與保存標示。

### 候選 4｜防曬和防蚊液都要用，哪個先？補擦時怎麼安排？

- 搜尋問句線索：`sunscreen or insect repellent first`是旅遊、露營與登山情境常見搜尋問句。
- 避免重複：現有長時間戶外文章有整體規劃，但沒有處理防蚊與防曬的疊加順序。
- 可引用主張：CDC 建議先防曬、再防蚊；防蚊產品可能降低防曬保護，需增加衣物遮蔽、補擦或減少曝曬時間。
- 主要來源：[CDC Yellow Book — Traveling Safely with Infants and Children](https://www.cdc.gov/yellow-book/hcp/family-travel/traveling-safely-with-infants-and-children.html)（2025；存取：2026-08-16）。
- 限制：CDC 原文包含兒童旅遊情境；成人成稿仍須核對產品標示，且不能任意混合兩產品於同一容器。

**本分類優先建議：候選 2、3、4。** 候選 1 與既有補擦文章相近，可作備選或 FAQ，不宜占一篇長文名額。

---

## 四、流汗或碰水後（sweat-and-water）

### 候選 1｜「海洋友善／reef-safe」有統一標準嗎？看到標章就代表零傷害嗎？

- 搜尋問句線索：`reef safe sunscreen`、`海洋友善防曬`在 2024–2026 搜尋與產品標籤中持續出現；AAD 最新標籤頁與 CDC Yellow Book 都特別說明此詞。
- 避免重複：既有抗水與水面反射文未談環境標示。
- 可引用主張：目前 `reef-safe` 並非 FDA 定義用語，也沒有全球一致標準；部分 UV 濾劑是水域環境的潛在關切物質，但研究仍在發展。
- 主要來源：[CDC Yellow Book — Sun Exposure in Travelers](https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/sun-exposure-in-travelers.html)（2025；存取：2026-08-16）、[US EPA — UV Filters in Sunscreens and Aquatic Environmental Health](https://www.epa.gov/water-research/uv-filters-sunscreens-and-aquatic-environmental-health)（2026；存取：2026-08-16）、[AAD Label Guide](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/understand-sunscreen-labels)（2026；存取：2026-08-16）。
- 限制：不能建立「安全／有毒成分黑白名單」或宣稱某產品對所有海洋物種零風險。

### 候選 2｜去海邊怎麼兼顧防曬與海洋？先靠衣物，還是只換一瓶防曬？

- 搜尋問句線索：`ocean friendly sun protection`、`去海邊防曬`、`水母衣 防曬`常與 reef-safe 一起搜尋。
- 避免重複：既有配件文是一般選購；本篇以海邊行為順序為核心：水母衣／遮蔭優先，裸露部位才用足量產品。
- 可引用主張：臺灣國家海洋研究院研究建議以長袖、防曬衣、遮陽帽等物理遮蔽減少防曬成分進入水域；海保署也鼓勵水母衣或海洋友善防曬。
- 主要來源：[國家海洋研究院—防曬乳成分對珊瑚影響之評估](https://www.namr.gov.tw/ch/home.jsp?dataserno=202110080008&id=50&mcustomize=research_view.jsp&parentpath=0%2C7)（發布：2021-10-08；更新：2026-01-15；存取：2026-08-16）、[海洋保育署—珊瑚礁生態系](https://www.oca.gov.tw/ch/home.jsp?id=176)（更新：2026-04-24；存取：2026-08-16）。
- 限制：防曬衣濕掉後的實際 UPF 依產品與布料而異；衣物也不能取代熱傷害與溺水安全措施。

### 候選 3｜礦物性防曬就一定對珊瑚比較友善嗎？氧化鋅也可能有影響嗎？

- 搜尋問句線索：`mineral sunscreen reef safe`常被直接畫上等號，是近年搜尋與產品行銷的常見混淆。
- 避免重複：候選 1 處理標章，本篇深入拆解「礦物性＝零風險」的錯誤二分法。
- 可引用主張：國海院的封閉水體實驗中，不同防曬有效成分及市售配方在一定實驗濃度下可能對珊瑚產生不良反應；研究也明確指出科學證據仍有限、學界有不同結果。
- 主要來源：[國家海洋研究院—防曬乳成分對珊瑚影響之評估](https://www.namr.gov.tw/ch/home.jsp?dataserno=202110080008&id=50&mcustomize=research_view.jsp&parentpath=0%2C7)（2021，2026 更新；存取：2026-08-16）、[NOAA — Effects of UV filters and sunscreen on corals](https://coralreef.noaa.gov/digital-corals/stories/documents/mar20/effects-ultraviolet-filters-sunscreen-corals)（存取：2026-08-16）。
- 限制：實驗濃度與真實海域暴露不能直接等同；不能依單一試驗替個別品牌做安全判定。

### 候選 4｜擦防曬不下水，也可能進入海洋嗎？日常洗澡和廢水是什麼關係？

- 搜尋問句線索：`does sunscreen wash into ocean`、`防曬乳 海洋 污染`是海洋友善主題的延伸問句。
- 避免重複：現有清潔文只談皮膚清潔，本篇談防曬濾劑從直接游泳與廢水進入水域的路徑。
- 可引用主張：NOAA 指出成分可能由游泳者直接進入海洋，也可能經污水排放；EPA 將部分 UV filters 視為水域環境中可能持久、累積的關切物質。
- 主要來源：[NOAA — Skincare Chemicals and Marine Life](https://oceanservice.noaa.gov/news/sunscreen-corals-noaa-studies.html)（近年更新；存取：2026-08-16）、[US EPA — UV Filters in Sunscreens and Aquatic Environmental Health](https://www.epa.gov/water-research/uv-filters-sunscreens-and-aquatic-environmental-health)（2026；存取：2026-08-16）。
- 限制：不要暗示個人一次洗澡即可量化造成珊瑚白化；珊瑚壓力來源包含暖化、酸化、污染與棲地破壞等多重因素。

**本分類優先建議：候選 1、2、3。** 三篇形成「看懂標示 → 實際行動 → 破解礦物性迷思」的完整系列；候選 4 可放 FAQ 或內文延伸。

---

## 五、回家後與皮膚照顧（after-sun-care）

### 候選 1｜曬後可以冰敷嗎？為什麼不建議直接把冰塊放在皮膚上？

- 搜尋問句線索：`sunburn ice or cold shower`、`曬傷可以冰敷嗎`是曬後急救的常見問句。
- 避免重複：既有輕微曬傷文提到降溫，本篇單獨處理「冷卻」與「直接冰敷」差別。
- 可引用主張：AAD 與 NHS 建議涼水沐浴、沖洗或涼濕敷；避免對受傷皮膚造成額外刺激。
- 主要來源：[AAD How to treat sunburn](https://www.aad.org/public/everyday-care/injured-skin/burns/treat-sunburn)（存取：2026-08-16）、[NHS Sunburn](https://www.nhs.uk/conditions/sunburn/)（存取：2026-08-16）。
- 限制：若官方原文未明說「禁止冰塊」，成稿不要把它寫成絕對禁令；可寫「以涼水／涼濕敷為優先，避免極冷直接刺激」。

### 候選 2｜曬傷後可以擦蘆薈嗎？挑產品時要注意什麼？

- 搜尋問句線索：`aloe vera for sunburn`、`曬傷 蘆薈`是跨語言常見搜尋問句。
- 避免重複：既有曬後保濕文泛談保濕，本篇回答使用者最常點名的蘆薈產品。
- 可引用主張：AAD 提到含蘆薈或大豆的保濕品可能有舒緩作用；先冷卻、保濕並補充水分。
- 主要來源：[AAD How to treat sunburn](https://www.aad.org/public/everyday-care/injured-skin/burns/treat-sunburn)（存取：2026-08-16）、[NHS Sunburn](https://www.nhs.uk/conditions/sunburn/)（存取：2026-08-16）。
- 限制：不可宣稱蘆薈能治癒、修復 DNA 或縮短所有曬傷；含香精、酒精或其他成分的產品仍可能刺激。

### 候選 3｜曬黑代表皮膚變健康嗎？曬後要美白還是先休息？

- 搜尋問句線索：`is tanning healthy`、`曬黑多久白回來`、`曬後美白`在美容與健康搜尋中長期常見。
- 避免重複：既有文章處理紅、痛、脫皮，沒有處理「只曬黑沒曬傷」與立即使用刺激性保養的問題。
- 可引用主張：NHS 明確指出沒有安全或健康的曬黑方式，曬黑不能保護皮膚免受有害影響；曬後以溫和照護與避免再次曝曬為先。
- 主要來源：[NHS Sunscreen and sun safety](https://www.nhs.uk/live-well/seasonal-health/sunscreen-and-sun-safety/)（審閱：2026-03-24；存取：2026-08-16）、[AAD The latest in sun protection](https://www.aad.org/news/latest-in-sun-protection)（2022；存取：2026-08-16）。
- 限制：不承諾膚色恢復時間；「美白」若涉及藥物或高濃度酸類，應由專業人員評估。

### 候選 4｜曬傷起水泡可以刺破嗎？水泡破掉後怎麼保護？

- 搜尋問句線索：`sunburn blisters pop`、`曬傷水泡怎麼辦`是常見急救問句。
- 避免重複：既有就醫警訊文判斷何時求助，本篇提供水泡尚未／已經破裂時的基本保護原則。
- 可引用主張：AAD 與 NHS 建議不要自行刺破水泡；水泡有助皮膚癒合，嚴重或大範圍水泡需醫療評估。
- 主要來源：[AAD How to treat sunburn](https://www.aad.org/public/everyday-care/injured-skin/burns/treat-sunburn)（存取：2026-08-16）、[NHS Sunburn](https://www.nhs.uk/conditions/sunburn/)（存取：2026-08-16）。
- 限制：避免提供傷口處置細節或藥品建議；若感染、發燒、惡化，導向醫療協助。

**本分類優先建議：候選 1、2、3。** 候選 4 與既有就醫警訊有部分交疊，可做短 FAQ 或內鏈。

---

## 六、特殊情況（special-situations）

### 候選 1｜懷孕、備孕或哺乳期間，可以擦防曬嗎？怎麼簡單選？

- 搜尋問句線索：`pregnancy safe sunscreen`、`孕婦防曬`是近年持續熱門的成分安全問句；AAD 2025 年更新孕期護膚專頁。
- 避免重複：現有特殊情況文章只處理曬傷、刺激與破皮，沒有孕期情境。
- 可引用主張：AAD 建議孕期仍應遮蔭、穿防曬衣並使用廣譜、抗水、SPF 30 以上產品；若對成分或皮膚變化有疑慮，與婦產科或皮膚科討論。
- 主要來源：[AAD Dermatologist-approved pregnancy skin care](https://www.aad.org/public/everyday-care/skin-care-secrets/routine/pregnancy-skin-care)（2025；存取：2026-08-16）。
- 限制：不可用一篇文章替所有孕婦判定個別產品安全；臺灣防曬屬化粧品管理，成分與標示需以在地產品為準。

### 候選 2｜嬰兒幾個月可以擦防曬？六個月以下要怎麼遮陽？

- 搜尋問句線索：`baby sunscreen age`、`嬰兒防曬 幾個月`是親子搜尋的典型問句；AAD／CDC FAQ 均專節回答。
- 避免重複：現有文章沒有嬰幼兒防曬。
- 可引用主張：六個月以下嬰兒以避免直射、遮蔭、輕薄衣物與寬邊帽為主；較大嬰幼兒使用防曬仍應配合遮蔽並避免過熱。
- 主要來源：[CDC Sun Safety Facts](https://www.cdc.gov/skin-cancer/sun-safety/)（2026；存取：2026-08-16）、[AAD How to decode a sunscreen label](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/understand-sunscreen-labels)（2026；存取：2026-08-16）。
- 限制：CDC 與 AAD 的美國建議略有表述差異；嚴重嬰兒曬傷屬需醫療評估的情況，不能只靠文章處理。

### 候選 3｜吃藥後比較容易曬傷是真的嗎？哪些情況要先問醫師或藥師？

- 搜尋問句線索：`medications sun sensitivity`、`吃藥 防曬`常見於抗生素、A 酸與旅遊問答。
- 避免重複：現有文章沒有藥物光敏感議題。
- 可引用主張：部分口服或外用藥物可能增加皮膚或眼睛對 UV 的敏感性；不應自行停藥，應詢問醫師或藥師並加強遮蔽與廣譜防曬。
- 主要來源：[CDC Ultraviolet Radiation](https://www.cdc.gov/radiation-health/features/uv-radiation.html)（2025；存取：2026-08-16）、[CDC Heat and Medications](https://www.cdc.gov/heat-health/hcp/clinical-guidance/heat-and-medications-guidance-for-clinicians.html)（2025；存取：2026-08-16）、[CDC Yellow Book — Sun Exposure in Travelers](https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/sun-exposure-in-travelers.html)（2025；存取：2026-08-16）。
- 限制：不得製作看似完整的藥物黑名單；個別藥物、劑量與停藥需由專業人員判斷。

### 候選 4｜有肝斑、痘印或色素沉著，防曬只看 UVA／UVB 夠嗎？

- 搜尋問句線索：`melasma sunscreen visible light`、`肝斑 潤色防曬`、`痘印 防曬`近年常與 tinted sunscreen 一起出現。
- 避免重複：UV 基礎候選 4 解釋可見光概念；本篇可針對已有色素困擾者的使用情境與求助界線。
- 可引用主張：AAD 指出可見光可能加重色素沉著；含氧化鐵的潤色廣譜防曬，可作整體防護的一部分。
- 主要來源：[AAD How to fade dark spots in darker skin tones](https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots)（近年更新；存取：2026-08-16）、[AAD Label Guide](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/understand-sunscreen-labels)（2026；存取：2026-08-16）。
- 限制：防曬是預防與輔助，不能宣稱治療肝斑或痘印；色素變化若異常應由皮膚科評估。

**本分類優先建議：候選 1、2、3。** 三篇都是高度明確的特殊族群／情況問句，也比把色素問題重複放在兩分類更清楚。

---

## 建議採用的 18 篇清單

| 分類 | 新增文章 1 | 新增文章 2 | 新增文章 3 |
|---|---|---|---|
| 了解今天的 UV | SPF 30、50、50+ 差多少？ | 天天防曬會影響維生素 D 嗎？ | 潤色防曬、可見光與防斑 |
| 出門前準備 | 物理性、化學性、混合型怎麼選？ | 保養、防曬、妝前與底妝順序 | 防曬乳、防曬棒、防曬噴霧比較 |
| 外出中的補擦 | 防曬棒怎麼補才夠？ | 噴霧防曬怎麼補才夠？ | 防曬與防蚊液的順序 |
| 流汗或碰水後 | reef-safe 有統一標準嗎？ | 去海邊如何兼顧防曬與海洋？ | 礦物性防曬一定對珊瑚友善嗎？ |
| 回家後與皮膚照顧 | 曬後可以冰敷嗎？ | 曬傷可以擦蘆薈嗎？ | 曬黑代表健康嗎？曬後先做什麼？ |
| 特殊情況 | 孕期／備孕／哺乳防曬 | 嬰兒幾個月可以擦防曬？ | 藥物光敏感與防曬 |

## 編寫時的重要限制

1. **海洋友善不能寫成保證。** `reef-safe` 沒有全球一致定義；文章宜使用「降低可能影響」「優先衣物遮蔽」「查看目的地規定」，不要寫「對珊瑚完全無害」。
2. **礦物性不等於零風險。** 國海院研究本身指出證據有限，且實驗條件不能直接外推真實海域或單一品牌。
3. **健康保護優先。** 討論環境影響時仍需避免讓使用者完全放棄防曬；以遮蔭、衣物、帽子等降低裸露面積，再於裸露處正確使用防曬。
4. **搜尋熱門不等於醫學正確。** 搜尋平台只決定問句與標題，答案必須回到官方來源。
5. **跨國法規要標明地區。** FDA、CDC、AAD 的成分與標籤說明主要是美國脈絡；臺灣版文章應以食藥署及臺灣實際標示為優先。
6. **特殊族群不做個人診斷。** 孕期、嬰兒、用藥與色素疾病文章需明確保留醫師／藥師諮詢入口。

## 海洋友善核心來源補充

- [海洋保育署—珊瑚礁生態系](https://www.oca.gov.tw/ch/home.jsp?id=176)（更新：2026-04-24）
- [國家海洋研究院—防曬乳成分對珊瑚影響之評估](https://www.namr.gov.tw/ch/home.jsp?dataserno=202110080008&id=50&mcustomize=research_view.jsp&parentpath=0%2C7)（發布：2021-10-08；更新：2026-01-15）
- [NOAA — Skincare Chemicals and Marine Life](https://oceanservice.noaa.gov/news/sunscreen-corals-noaa-studies.html)（存取：2026-08-16）
- [NOAA — Effects of UV Filters and Sunscreen on Corals and Aquatic Ecosystems](https://coralreef.noaa.gov/digital-corals/stories/documents/mar20/effects-ultraviolet-filters-sunscreen-corals)（存取：2026-08-16）
- [US EPA — UV Filters in Sunscreens and Aquatic Environmental Health](https://www.epa.gov/water-research/uv-filters-sunscreens-and-aquatic-environmental-health)（2026；存取：2026-08-16）

