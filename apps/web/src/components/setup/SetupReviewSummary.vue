<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { computed, shallowRef } from "vue";
import type {
  ProductLabelSnapshotV1,
  SetupDraftV1,
  SetupDraftZoneV1
} from "@sunshield/contracts";
import type { WaterStartFormValue } from "../../features/setup/createSetupController";
import {
  BODY_ZONE_GROUPS,
  BODY_ZONE_LABELS,
  CONTEXT_LABELS
} from "../../features/setup/setupCatalog";

interface Props {
  draft: SetupDraftV1;
  applicationTime: string | null;
  waterStart: WaterStartFormValue | null;
}

const props = defineProps<Props>();
const productDetailsExpanded = shallowRef(false);

interface ReviewLine {
  id: string;
  label: string;
  method: string;
}

const protectionLines = computed<ReviewLine[]>(() => {
  const result: ReviewLine[] = [];

  for (const group of BODY_ZONE_GROUPS) {
    const zones = props.draft.zones.filter((zone) =>
      (group.zoneCodes as readonly string[]).includes(
        zone.bodyZoneCode
      )
    );
    if (zones.length === 0) continue;
    const methods = new Set(zones.map(methodLabel));
    if (methods.size === 1) {
      result.push({
        id: group.id,
        label: group.label,
        method: methodLabel(zones[0]!)
      });
    } else {
      result.push(
        ...zones.map((zone) => ({
          id: zone.draftZoneKey,
          label: BODY_ZONE_LABELS[zone.bodyZoneCode],
          method: methodLabel(zone)
        }))
      );
    }
  }

  result.push(
    ...props.draft.zones
      .filter((zone) => zone.bodyZoneCode === "custom")
      .map((zone) => ({
        id: zone.draftZoneKey,
        label: zone.customLabel ?? "其他部位",
        method: methodLabel(zone)
      }))
  );
  return result;
});

const snapshot = computed<ProductLabelSnapshotV1 | null>(
  () =>
    props.draft.applications[0]?.productLabelSnapshot ?? null
);

const hasTopical = computed(() =>
  props.draft.zones.some((zone) =>
    zone.methodComponents.some(
      (method) =>
        method === "sunscreen" || method === "other_topical"
    )
  )
);

function methodLabel(zone: SetupDraftZoneV1): string {
  const hasClothing = zone.methodComponents.includes("clothing");
  const hasSunscreen =
    zone.methodComponents.includes("sunscreen");
  const hasOther = zone.methodComponents.includes("other_topical");
  if (hasClothing && hasSunscreen) {
    return "衣物完整覆蓋；衣物下方有擦防曬產品";
  }
  if (hasClothing) return "被衣物完整遮住";
  if (hasOther) return "其他外用產品";
  return "已擦防曬產品";
}

function claimLabel(value: ProductLabelSnapshotV1): string {
  if (value.identityStatus === "identity_unconfirmed") {
    return "標示不確定，不建立產品期限";
  }
  if (value.sunscreenClaimStatus === "no_claim") {
    return "沒有防曬宣稱，不建立產品期限";
  }
  return "已確認有防曬／SPF 標示";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
</script>

<template>
  <div class="review-summary page-stack">
    <section class="review-card review-card--plain">
      <p class="review-card__eyebrow">目前情境</p>
      <h2>{{ CONTEXT_LABELS[draft.initialContext!] }}</h2>
      <RouterLink to="/setup/context">修改情境</RouterLink>
    </section>

    <section class="review-card app-card">
      <div class="review-card__heading">
        <div>
          <p class="review-card__eyebrow">追蹤部位與方式</p>
          <h2>
            <span class="stat-figure stat-figure--inline">
              {{ protectionLines.length }}
            </span>
            組已確認
          </h2>
        </div>
        <RouterLink
          :to="{
            name: 'setup-timing',
            query: { adjustProtection: '1' }
          }"
        >
          修改
        </RouterLink>
      </div>
      <dl class="review-list">
        <div v-for="line in protectionLines" :key="line.id">
          <dt>{{ line.label }}</dt>
          <dd>{{ line.method }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="hasTopical && snapshot" class="review-card app-card">
      <button
        class="review-card__accordion-header"
        type="button"
        :aria-expanded="productDetailsExpanded"
        @click="productDetailsExpanded = !productDetailsExpanded"
      >
        <div>
          <p class="review-card__eyebrow">產品與實際時間</p>
          <h2>本次使用的產品標示</h2>
        </div>
        <div class="review-card__controls">
          <RouterLink
            class="review-card__edit-link"
            to="/setup/timing"
          >
            修改
          </RouterLink>
          <ChevronDown
            class="review-card__chevron"
            :class="{ 'review-card__chevron--expanded': productDetailsExpanded }"
            :size="20"
            aria-hidden="true"
          />
        </div>
      </button>

      <dl v-if="productDetailsExpanded" class="review-list review-list--animated">
        <div>
          <dt>產品</dt>
          <dd>目前使用產品</dd>
        </div>
        <div>
          <dt>產品身分</dt>
          <dd>{{ claimLabel(snapshot) }}</dd>
        </div>
        <div>
          <dt>實際塗抹</dt>
          <dd v-if="applicationTime" class="stat-figure">
            {{ formatDateTime(applicationTime) }}
          </dd>
          <dd v-else>需要重新確認</dd>
        </div>
        <div>
          <dt>等待方式</dt>
          <dd v-if="snapshot.preExposureWaitStatus === 'explicit_minutes'">
            曝曬前等待
            <span class="stat-figure stat-figure--inline">
              {{ snapshot.preExposureWaitMinutes }}
            </span>
            分鐘
          </dd>
          <dd v-else-if="snapshot.preExposureWaitStatus === 'unknown'">
            曝曬前等待時間不確定
          </dd>
          <dd v-else>包裝沒有曝曬前等待說明</dd>
        </div>
        <div>
          <dt>一般補擦</dt>
          <dd v-if="snapshot.reapplicationIntervalStatus === 'explicit_minutes'">
            包裝一般補擦標示
            <span class="stat-figure stat-figure--inline">
              {{ snapshot.reapplicationIntervalMinutes }}
            </span>
            分鐘
          </dd>
          <dd v-else-if="snapshot.reapplicationIntervalStatus === 'unknown'">
            一般補擦標示不確定
          </dd>
          <dd v-else>包裝沒有明確的一般補擦分鐘數</dd>
        </div>
        <div
          v-if="
            draft.initialContext === 'water_preparing' ||
            draft.initialContext === 'water_active'
          "
        >
          <dt>耐水標示</dt>
          <dd v-if="snapshot.waterResistanceStatus === '40' || snapshot.waterResistanceStatus === '80'">
            耐水
            <span class="stat-figure stat-figure--inline">
              {{ snapshot.waterResistanceMinutes }}
            </span>
            分鐘
          </dd>
          <dd v-else-if="snapshot.waterResistanceStatus === 'not_water_resistant'">
            明確標示不耐水
          </dd>
          <dd v-else-if="snapshot.waterResistanceStatus === 'no_claim'">
            沒有耐水宣稱
          </dd>
          <dd v-else>耐水標示不確定</dd>
        </div>
        <div v-if="draft.initialContext === 'water_active'">
          <dt>入水時間</dt>
          <dd v-if="waterStart?.confidence === 'unknown'">
            不確定，採保守提醒
          </dd>
          <dd
            v-else-if="waterStart?.activityStartedAt"
            class="stat-figure"
          >
            {{ formatDateTime(waterStart.activityStartedAt) }}
          </dd>
          <dd v-else>需要重新確認</dd>
        </div>
      </dl>
    </section>

    <section v-else class="clothing-summary clothing-summary--success">
      <p class="review-card__eyebrow">產品與時間</p>
      <h2>已記錄衣物覆蓋</h2>
      <p>
        已記錄為衣物完整遮蔽。目前不會為這個部位顯示產品補擦倒數；遮蔽狀態改變時，請重新回報。
      </p>
    </section>
  </div>
</template>

<style scoped>
.review-summary {
  display: grid;
  gap: var(--space-4);
  width: 100% !important;
}

.review-card,
.clothing-summary {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.clothing-summary--success {
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: none;
  background: var(--color-success-soft);
}

.review-card--plain {
  padding: 0 0 var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.review-card__heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
}

.review-card__accordion-header {
  display: flex;
  width: 100%;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.review-card__accordion-header:hover {
  opacity: 0.8;
}

.review-card__accordion-header > div:first-child {
  min-width: 0;
}

.review-card__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.review-card__edit-link {
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-out);
}

.review-card__edit-link:hover {
  border-color: var(--text-primary);
  background: var(--page-background);
}

.review-card__chevron {
  color: var(--text-secondary);
  transition: transform var(--duration-fast) var(--ease-out);
}

.review-card__chevron--expanded {
  transform: rotate(180deg);
}

.review-card__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

.review-card h2,
.clothing-summary h2,
.clothing-summary p {
  margin: 0;
}

.review-card h2,
.clothing-summary h2 {
  font-size: 1.2rem;
  font-weight: 500;
}

.review-card a {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.review-list {
  display: grid;
  margin: 0;
}

.review-list--animated {
  animation: slideDown var(--duration-normal) var(--ease-out);
}

.review-list > div {
  display: grid;
  grid-template-columns: minmax(7rem, 0.8fr) minmax(0, 1.5fr);
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border-subtle);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.review-list dt {
  color: var(--text-secondary);
}

.review-list dd {
  margin: 0;
  line-height: 1.7;
}

.clothing-summary > p:last-child {
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 31rem) {
  .review-list > div {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
}
</style>
