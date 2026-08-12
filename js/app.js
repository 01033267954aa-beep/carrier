// Carrier GreenON 웹앱 스크립트입니다.
// 실제 Carrier 에어컨 API는 연결하지 않고, 가상 IoT 데이터와 Supabase 저장 구조를 함께 사용합니다.

const navButtons = document.querySelectorAll(".nav-button");
const screens = document.querySelectorAll(".screen");
const supabaseConfig = globalThis.window?.GREENON_SUPABASE_CONFIG;
const greenonSupabase =
  globalThis.window?.supabase && supabaseConfig
    ? globalThis.window.supabase.createClient(
        supabaseConfig.url,
        supabaseConfig.publishableKey,
      )
    : null;

const PRODUCT_ROUTE_PREFIX = "#/shop/";
const DEFAULT_PRODUCTS = [
  {
    id: "food-starbucks-americano",
    code: "FOOD_STARBUCKS_AMERICANO",
    category: "FOOD",
    name: "스타벅스 아메리카노",
    description: "친환경 냉방 미션 후 시원하게 사용할 수 있는 커피 리워드입니다.",
    detail:
      "GREEN POINT로 교환 가능한 모바일 커피 쿠폰입니다. 에너지 절약 습관을 이어가며 일상 속 작은 보상을 받을 수 있습니다.",
    price: 4500,
    icon: "☕",
  },
  {
    id: "food-convenience-voucher",
    code: "FOOD_CONVENIENCE_VOUCHER",
    category: "FOOD",
    name: "편의점 모바일 상품권",
    description: "가까운 편의점에서 사용할 수 있는 생활형 모바일 상품권입니다.",
    detail:
      "간식, 음료, 생필품 구매에 사용할 수 있는 실용적인 리워드입니다. 미션을 꾸준히 완료한 사용자에게 적합합니다.",
    price: 5000,
    icon: "▣",
  },
  {
    id: "life-eco-tumbler",
    code: "LIFE_ECO_TUMBLER",
    category: "LIFE",
    name: "친환경 텀블러",
    description: "일회용 컵 사용을 줄이는 데 도움이 되는 텀블러 리워드입니다.",
    detail:
      "반복 사용 가능한 텀블러로 GREEN ON 생활 습관을 이어갈 수 있습니다. 캠퍼스와 사무실 모두에 어울리는 깔끔한 디자인을 가정했습니다.",
    price: 8000,
    icon: "♻",
  },
  {
    id: "life-eco-bag",
    code: "LIFE_ECO_BAG",
    category: "LIFE",
    name: "에코백",
    description: "가볍게 들고 다니는 친환경 장바구니 리워드입니다.",
    detail:
      "일상 이동과 장보기에서 비닐 사용을 줄일 수 있는 리워드입니다. Carrier GreenON 브랜드 무드를 담은 샘플 상품입니다.",
    price: 6000,
    icon: "□",
  },
  {
    id: "carrier-aircon-filter",
    code: "CARRIER_AIRCON_FILTER",
    category: "CARRIER",
    name: "Carrier 에어컨 필터",
    description: "쾌적한 냉방과 에너지 효율 관리를 위한 필터 리워드입니다.",
    detail:
      "필터 관리는 냉방 효율과 실내 공기질을 함께 관리하는 핵심 습관입니다. 실제 Carrier API나 실제 부품 구매 연동은 하지 않는 샘플 상품입니다.",
    price: 12000,
    icon: "▤",
  },
  {
    id: "carrier-green-goods",
    code: "CARRIER_GREEN_GOODS",
    category: "CARRIER",
    name: "Carrier 친환경 굿즈",
    description: "청량한 바람 콘셉트의 Carrier GreenON 굿즈 패키지입니다.",
    detail:
      "윈디 마스코트와 파란색 브랜드 무드를 담은 가상의 굿즈입니다. 친환경 냉방 미션 참여 경험을 확장하기 위한 리워드입니다.",
    price: 10000,
    icon: "G",
  },
];

const PRODUCT_COPY_BY_CODE = DEFAULT_PRODUCTS.reduce((copyMap, product) => {
  copyMap[product.code] = product;
  return copyMap;
}, {});

const airconState = {
  power: true,
  mode: "냉방",
  temperature: 26,
  fan: "자동풍",
  runtimeMinutes: 90,
  filter: "깨끗함",
  sensor: "정상",
  health: "normal",
};

const weatherState = {
  temperature: 29,
  humidity: 61,
  condition: "SUNNY",
};

const missionState = {
  status: "ready",
  dbMissionId: "",
  userMissionId: "",
  elapsedMinutes: 0,
  targetMinutes: 120,
  rewardPoint: 300,
  rewardGranted: false,
};

const walletState = {
  point: 0,
  transactions: [],
};

const userState = {
  isLoggedIn: false,
  userId: "",
  name: "Guest",
  email: "",
  completedMissions: 0,
};

const shopState = {
  selectedCategory: "ALL",
  selectedProductId: "",
  orders: [],
  rewards: [...DEFAULT_PRODUCTS],
};

const dbState = {
  loadedPublicData: false,
  syncing: false,
  missions: [],
};

// 화면별 구성 요소를 함수 단위로 나눠 관리합니다. React 컴포넌트는 아니지만,
// WindyMascot, StatusCard, ProductCard, ProductDetail 역할을 하는 렌더 함수를 분리했습니다.
function formatRuntime(minutes) {
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours === 0) {
    return `${restMinutes}분`;
  }

  return `${hours}시간 ${restMinutes}분`;
}

function formatPoint(point) {
  return `${Number(point).toLocaleString("ko-KR")}P`;
}

function getCurrentProgress() {
  return Math.min(
    100,
    Math.round((missionState.elapsedMinutes / missionState.targetMinutes) * 100),
  );
}

function getRewardById(rewardId) {
  return shopState.rewards.find((reward) => String(reward.id) === String(rewardId));
}

function getProductImageLabel(reward) {
  return reward.icon || PRODUCT_COPY_BY_CODE[reward.code]?.icon || reward.name.slice(0, 1);
}

function getProductDetailText(reward) {
  return (
    reward.detail ||
    PRODUCT_COPY_BY_CODE[reward.code]?.detail ||
    `${reward.name}을 GREEN POINT로 교환할 수 있는 Carrier GreenON 리워드입니다.`
  );
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function setHashForScreen(screenName) {
  if (screenName === "product-detail") {
    return;
  }

  const nextHash = screenName === "home" ? "#/home" : `#/${screenName}`;
  if (window.location.hash !== nextHash) {
    window.history.pushState(null, "", nextHash);
  }
}

function showScreen(targetScreenName, options = {}) {
  const isDetail = targetScreenName === "product-detail";

  navButtons.forEach((navButton) => {
    navButton.classList.toggle(
      "is-active",
      !isDetail && navButton.dataset.screen === targetScreenName,
    );
  });

  screens.forEach((screen) => {
    const isTargetScreen = screen.id === `screen-${targetScreenName}`;
    screen.classList.toggle("is-active", isTargetScreen);
  });

  if (!options.skipHash) {
    setHashForScreen(targetScreenName);
  }

  if (targetScreenName === "shop") {
    renderShop();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openProductDetail(productId, options = {}) {
  const reward = getRewardById(productId);

  if (!reward) {
    showScreen("shop", options);
    return;
  }

  shopState.selectedProductId = String(productId);
  renderProductDetail();
  showScreen("product-detail", { skipHash: true });

  if (!options.skipHash) {
    window.history.pushState(null, "", `${PRODUCT_ROUTE_PREFIX}${encodeURIComponent(productId)}`);
  }
}

function handleRoute() {
  const hash = window.location.hash || "#/home";
  const productPrefix = "#/shop/";

  if (hash.startsWith(productPrefix)) {
    const productId = decodeURIComponent(hash.slice(productPrefix.length));
    openProductDetail(productId, { skipHash: true });
    return;
  }

  if (hash === "#/shop") {
    showScreen("shop", { skipHash: true });
    return;
  }

  const screenName = hash.replace("#/", "") || "home";
  const allowedScreens = ["home", "mission", "wallet", "report"];
  showScreen(allowedScreens.includes(screenName) ? screenName : "home", {
    skipHash: true,
  });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.screen);
  });
});

document.querySelectorAll("[data-go-screen]").forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.goScreen);
  });
});

window.addEventListener("hashchange", handleRoute);

function fetchWeatherData(condition = weatherState.condition) {
  // 실제 날씨 API는 호출하지 않습니다. API 키가 준비되면 이 함수 내부만 교체하면 됩니다.
  if (condition === "HUMID") {
    return {
      temperature: 30,
      humidity: 78,
      condition: "HUMID",
      message: "습도가 높아 자동풍 미션이 추천되는 날씨입니다.",
    };
  }

  return {
    temperature: 29,
    humidity: 61,
    condition: "SUNNY",
    message: "쾌적한 일반 냉방 미션을 진행하기 좋은 날씨입니다.",
  };
}

function renderWeather() {
  document.querySelector("#weather-temp").textContent = `${weatherState.temperature}°C`;
  document.querySelector("#weather-humidity").textContent = `습도 ${weatherState.humidity}%`;
  document.querySelector("#hero-weather").textContent =
    `${weatherState.temperature}°C · ${weatherState.humidity}%`;
  document.querySelector("#weather-message").textContent =
    weatherState.condition === "HUMID"
      ? "습도가 높아 자동풍 미션이 추천되는 날씨입니다."
      : "쾌적한 일반 냉방 미션을 진행하기 좋은 날씨입니다.";
}

function applyWeatherMission() {
  const humidMission = dbState.missions.find(
    (mission) => mission.weather_condition === "HUMID",
  );
  const defaultMission =
    dbState.missions.find((mission) => mission.weather_condition === "ALL") ||
    dbState.missions[0];
  const selectedMission =
    weatherState.condition === "HUMID" && humidMission ? humidMission : defaultMission;

  if (!selectedMission) {
    return;
  }

  missionState.dbMissionId = selectedMission.id;
  missionState.targetMinutes = selectedMission.target_minutes;
  missionState.rewardPoint = selectedMission.reward_points;
  document.querySelector("#home-mission-title").textContent = selectedMission.title;
  document.querySelector("#home-mission-description").textContent =
    selectedMission.description;
  document.querySelector("#hero-mission-title").textContent = selectedMission.title;
  document.querySelector("#mission-title").textContent = selectedMission.title;
  document.querySelector("#mission-description").textContent = selectedMission.description;
  renderMissionStatus();
}

function isAirconDanger() {
  return airconState.health !== "normal";
}

function getMissionConditions() {
  return {
    temp: airconState.temperature >= 26,
    filter: airconState.filter === "깨끗함",
    sensor: airconState.sensor === "정상",
  };
}

function hasMissionViolation() {
  const conditions = getMissionConditions();
  return !conditions.temp || !conditions.filter || !conditions.sensor;
}

function renderAirconStatus() {
  const statusCard = document.querySelector("#aircon-status-card");
  const healthPill = document.querySelector("#aircon-health-pill");
  const powerText = document.querySelector("#aircon-power");
  const messageText = document.querySelector("#aircon-message");

  document.querySelector("#aircon-mode").textContent = airconState.mode;
  document.querySelector("#aircon-temp").textContent = `${airconState.temperature}°C`;
  document.querySelector("#aircon-fan").textContent = airconState.fan;
  document.querySelector("#aircon-runtime").textContent = formatRuntime(
    airconState.runtimeMinutes,
  );
  document.querySelector("#aircon-filter").textContent = airconState.filter;
  document.querySelector("#aircon-sensor").textContent = airconState.sensor;

  document.querySelector("#home-aircon-temp").textContent = `${airconState.temperature}°C`;
  document.querySelector("#home-aircon-mode").textContent = airconState.mode;
  document.querySelector("#home-aircon-fan").textContent = airconState.fan;
  document.querySelector("#home-aircon-filter").textContent = airconState.filter;
  document.querySelector("#home-aircon-sensor").textContent = airconState.sensor;

  powerText.textContent = airconState.power ? "POWER ON" : "POWER OFF";

  const danger = isAirconDanger();
  statusCard.classList.toggle("is-danger", danger);
  healthPill.classList.toggle("is-danger", danger);

  if (airconState.health === "filter") {
    healthPill.textContent = "필터 점검";
    document.querySelector("#hero-aircon").textContent = "필터 점검";
    messageText.textContent = "필터 점검이 필요합니다. 미션 조건 위반 가능성이 있습니다.";
    renderWindyMascot();
    return;
  }

  if (airconState.health === "sensor") {
    healthPill.textContent = "센서 오류";
    document.querySelector("#hero-aircon").textContent = "센서 오류";
    messageText.textContent = "센서 값이 비정상입니다. 상태 확인이 필요합니다.";
    renderWindyMascot();
    return;
  }

  healthPill.textContent = "정상";
  document.querySelector("#hero-aircon").textContent = "정상";
  messageText.textContent = "쾌적한 친환경 냉방 상태입니다.";
  renderWindyMascot();
}

document.querySelectorAll("[data-weather]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextWeather = fetchWeatherData(button.dataset.weather);
    weatherState.temperature = nextWeather.temperature;
    weatherState.humidity = nextWeather.humidity;
    weatherState.condition = nextWeather.condition;
    renderWeather();
    applyWeatherMission();
  });
});

function saveAirconStatusToSupabase() {
  if (!greenonSupabase || !userState.isLoggedIn || !userState.userId) {
    return;
  }

  // 가상 IoT 상태도 사용자별 aircon_status 행 하나로 저장합니다.
  greenonSupabase
    .from("aircon_status")
    .upsert({
      user_id: userState.userId,
      power: airconState.power,
      mode: airconState.mode,
      temperature: airconState.temperature,
      fan: airconState.fan,
      runtime_minutes: airconState.runtimeMinutes,
      filter_status: airconState.filter,
      sensor_status: airconState.sensor,
      health: airconState.health,
      updated_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) {
        setAuthMessage(`에어컨 상태 저장 실패: ${error.message}`, true);
      }
    });
}

document.querySelectorAll("[data-aircon-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.airconAction;

    if (action === "normal") {
      airconState.health = "normal";
      airconState.filter = "깨끗함";
      airconState.sensor = "정상";
    }

    if (action === "filter") {
      airconState.health = "filter";
      airconState.filter = "점검 필요";
      airconState.sensor = "정상";
    }

    if (action === "sensor") {
      airconState.health = "sensor";
      airconState.filter = "깨끗함";
      airconState.sensor = "오류";
    }

    if (action === "runtime") {
      airconState.runtimeMinutes += 30;
      addMissionTime(30);
    }

    if (action === "tempDown") {
      airconState.temperature -= 1;
    }

    if (action === "tempUp") {
      airconState.temperature += 1;
    }

    renderAirconStatus();
    renderMissionStatus();
    saveAirconStatusToSupabase();
  });
});

function setConditionState(elementId, isOk) {
  const element = document.querySelector(elementId);
  element.classList.toggle("is-ok", isOk);
  element.classList.toggle("is-danger", !isOk);
}

function setProgressRing(selector, progress, circumference) {
  const ring = document.querySelector(selector);
  if (!ring) {
    return;
  }

  const offset = circumference - (progress / 100) * circumference;
  ring.style.strokeDashoffset = String(offset);
}

function renderMissionStatus() {
  const missionCard = document.querySelector("#mission-card");
  const statePill = document.querySelector("#mission-state-pill");
  const alert = document.querySelector("#mission-alert");
  const progressText = document.querySelector("#mission-progress-text");
  const homeProgressText = document.querySelector("#home-progress-text");
  const progressFill = document.querySelector("#mission-progress-fill");
  const timeText = document.querySelector("#mission-time-text");
  const startButton = document.querySelector("#start-mission-button");

  const progress = getCurrentProgress();
  const conditions = getMissionConditions();
  const violation = hasMissionViolation();

  setConditionState("#condition-temp", conditions.temp);
  setConditionState("#condition-filter", conditions.filter);
  setConditionState("#condition-sensor", conditions.sensor);

  progressText.textContent = `${progress}%`;
  homeProgressText.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;
  setProgressRing("#mission-progress-ring", progress, 352);
  setProgressRing("#home-progress-ring", progress, 302);
  timeText.textContent = `${formatRuntime(missionState.elapsedMinutes)} / ${formatRuntime(
    missionState.targetMinutes,
  )}`;

  missionCard.classList.toggle("is-danger", missionState.status === "failed");
  statePill.classList.toggle(
    "is-danger",
    missionState.status === "failed" || (missionState.status === "running" && violation),
  );
  alert.classList.toggle(
    "is-danger",
    missionState.status === "failed" || (missionState.status === "running" && violation),
  );

  startButton.disabled = missionState.status === "running";

  if (missionState.status === "ready") {
    statePill.textContent = "대기";
    alert.textContent = "미션 시작 전입니다. 조건을 확인하고 미션을 시작하세요.";
    renderWindyMascot();
    return;
  }

  if (missionState.status === "running" && violation) {
    statePill.textContent = "주의";
    alert.textContent = "미션 조건 위반 상태입니다. 온도, 필터, 센서를 정상으로 돌려주세요.";
    renderWindyMascot();
    return;
  }

  if (missionState.status === "running") {
    statePill.textContent = "진행 중";
    alert.textContent = "조건이 정상입니다. +30분 시뮬레이션으로 미션 시간을 채워보세요.";
    renderWindyMascot();
    return;
  }

  if (missionState.status === "success") {
    statePill.textContent = "성공";
    alert.textContent = `미션 성공! GREEN POINT ${formatPoint(
      missionState.rewardPoint,
    )} 지급 준비가 완료되었습니다.`;
    renderWindyMascot();
    return;
  }

  statePill.textContent = "실패";
  alert.textContent = "미션 실패입니다. 조건을 정상으로 만든 뒤 다시 시작하세요.";
  renderWindyMascot();
}

function evaluateMission() {
  if (missionState.status !== "running") {
    return;
  }

  if (hasMissionViolation()) {
    missionState.status = "failed";
    return;
  }

  if (missionState.elapsedMinutes >= missionState.targetMinutes) {
    missionState.status = "success";
    grantMissionReward();
  }
}

function addPointTransaction(type, title, point) {
  // Supabase 저장 전에도 화면 반응을 즉시 보여주기 위해 브라우저 상태 배열에 먼저 기록합니다.
  walletState.transactions.unshift({
    id: `tx-${Date.now()}-${walletState.transactions.length}`,
    type,
    title,
    point,
    createdAt: new Date().toLocaleString("ko-KR"),
  });
}

function grantMissionReward() {
  if (missionState.rewardGranted) {
    return;
  }

  missionState.rewardGranted = true;
  userState.completedMissions += 1;
  walletState.point += missionState.rewardPoint;
  addPointTransaction("earn", "26°C 유지 냉방 미션 성공", missionState.rewardPoint);
  renderWallet();
  renderShop();
  renderUserAndReport();
  triggerWindyPointAnimation();
  saveMissionRewardToSupabase();
}

function addMissionTime(minutes) {
  if (missionState.status !== "running") {
    return;
  }

  missionState.elapsedMinutes += minutes;
  evaluateMission();
  saveMissionProgressToSupabase();
}

document.querySelector("#start-mission-button").addEventListener("click", async () => {
  missionState.status = hasMissionViolation() ? "failed" : "running";
  missionState.elapsedMinutes = 0;
  missionState.rewardGranted = false;
  missionState.userMissionId = "";
  await createUserMissionInSupabase();
  renderMissionStatus();
});

document.querySelector("#mission-time-button").addEventListener("click", () => {
  airconState.runtimeMinutes += 30;
  addMissionTime(30);
  renderAirconStatus();
  renderMissionStatus();
});

document.querySelector("#reset-mission-button").addEventListener("click", () => {
  missionState.status = "ready";
  missionState.elapsedMinutes = 0;
  missionState.rewardGranted = false;
  renderMissionStatus();
});

function renderHistoryList(listElement, transactions, emptyText) {
  listElement.innerHTML = "";

  if (transactions.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-history";
    emptyItem.textContent = emptyText;
    listElement.append(emptyItem);
    return;
  }

  transactions.forEach((transaction) => {
    const item = document.createElement("li");
    const pointPrefix = transaction.type === "earn" ? "+" : "-";

    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${transaction.title}</strong>
        <span>${transaction.createdAt}</span>
      </div>
      <span class="history-point ${transaction.type === "spend" ? "is-spend" : ""}">
        ${pointPrefix}${formatPoint(transaction.point)}
      </span>
    `;
    listElement.append(item);
  });
}

function renderWallet() {
  const earnTransactions = walletState.transactions.filter(
    (transaction) => transaction.type === "earn",
  );
  const spendTransactions = walletState.transactions.filter(
    (transaction) => transaction.type === "spend",
  );

  document.querySelector("#wallet-point").textContent = formatPoint(walletState.point);
  document.querySelector("#hero-point").textContent = formatPoint(walletState.point);
  document.querySelector("#earn-count").textContent = `${earnTransactions.length}건`;
  document.querySelector("#spend-count").textContent = `${spendTransactions.length}건`;

  renderHistoryList(
    document.querySelector("#earn-history"),
    earnTransactions,
    "아직 적립된 포인트가 없습니다.",
  );
  renderHistoryList(
    document.querySelector("#spend-history"),
    spendTransactions,
    "아직 사용한 포인트가 없습니다.",
  );
}

async function loadPublicSupabaseData() {
  if (!greenonSupabase || dbState.loadedPublicData) {
    return;
  }

  const [{ data: missions, error: missionError }, { data: rewards, error: rewardError }] =
    await Promise.all([
      greenonSupabase
        .from("missions")
        .select(
          "id, code, title, description, target_minutes, min_temperature, reward_points, weather_condition",
        )
        .eq("active", true)
        .order("created_at", { ascending: true }),
      greenonSupabase
        .from("rewards")
        .select("id, code, category, name, description, price")
        .eq("active", true)
        .order("created_at", { ascending: true }),
    ]);

  if (missionError || rewardError) {
    setAuthMessage(
      `Supabase 공개 데이터 로드 실패: ${(missionError || rewardError).message}`,
      true,
    );
    return;
  }

  if (missions?.length) {
    dbState.missions = missions;
    const todayMission = missions[0];
    missionState.dbMissionId = todayMission.id;
    missionState.targetMinutes = todayMission.target_minutes;
    missionState.rewardPoint = todayMission.reward_points;
  }

  // Supabase에 등록된 상품은 유지하되, 과제 요구 샘플 6개보다 적으면 기본 상품을 보강합니다.
  if (rewards?.length) {
    const mappedRewards = rewards.map((reward) => {
      const fallback = PRODUCT_COPY_BY_CODE[reward.code] || {};
      return {
        ...fallback,
        id: reward.id,
        code: reward.code,
        category: reward.category,
        name: reward.name,
        description: reward.description,
        price: reward.price,
        icon: fallback.icon || reward.name.slice(0, 1),
      };
    });
    const usedCodes = new Set(mappedRewards.map((reward) => reward.code));
    const fallbackRewards = DEFAULT_PRODUCTS.filter((product) => !usedCodes.has(product.code));
    shopState.rewards = [...mappedRewards, ...fallbackRewards].slice(0, 12);
  }

  dbState.loadedPublicData = true;
  applyWeatherMission();
  renderWeather();
  renderMissionStatus();
  renderShop();
  if (shopState.selectedProductId) {
    renderProductDetail();
  }
}

async function loadUserSupabaseData() {
  if (!greenonSupabase || !userState.isLoggedIn || !userState.userId) {
    return;
  }

  const [
    { data: airconRow, error: airconError },
    { data: transactions, error: transactionError },
    { data: orders, error: orderError },
    { data: latestMission, error: missionError },
  ] = await Promise.all([
    greenonSupabase
      .from("aircon_status")
      .select("power, mode, temperature, fan, runtime_minutes, filter_status, sensor_status, health")
      .eq("user_id", userState.userId)
      .maybeSingle(),
    greenonSupabase
      .from("point_transactions")
      .select("id, transaction_type, title, amount, created_at")
      .eq("user_id", userState.userId)
      .order("created_at", { ascending: false }),
    greenonSupabase
      .from("reward_orders")
      .select("id, point_spent, created_at, rewards(name)")
      .eq("user_id", userState.userId)
      .order("created_at", { ascending: false }),
    greenonSupabase
      .from("user_missions")
      .select("id, mission_id, status, elapsed_minutes, reward_granted")
      .eq("user_id", userState.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = airconError || transactionError || orderError || missionError;

  if (firstError) {
    setAuthMessage(`사용자 데이터 로드 실패: ${firstError.message}`, true);
    return;
  }

  if (airconRow) {
    airconState.power = airconRow.power;
    airconState.mode = airconRow.mode;
    airconState.temperature = airconRow.temperature;
    airconState.fan = airconRow.fan;
    airconState.runtimeMinutes = airconRow.runtime_minutes;
    airconState.filter = airconRow.filter_status;
    airconState.sensor = airconRow.sensor_status;
    airconState.health = airconRow.health;
  }

  walletState.transactions = (transactions || []).map((transaction) => ({
    id: transaction.id,
    type: transaction.transaction_type,
    title: transaction.title,
    point: transaction.amount,
    createdAt: new Date(transaction.created_at).toLocaleString("ko-KR"),
  }));
  userState.completedMissions = walletState.transactions.filter(
    (transaction) => transaction.type === "earn",
  ).length;

  walletState.point = walletState.transactions.reduce((total, transaction) => {
    return total + (transaction.type === "earn" ? transaction.point : -transaction.point);
  }, 0);

  shopState.orders = (orders || []).map((order) => ({
    id: order.id,
    rewardName: order.rewards?.name || "리워드 상품",
    price: order.point_spent,
    createdAt: new Date(order.created_at).toLocaleString("ko-KR"),
  }));

  if (latestMission) {
    missionState.userMissionId = latestMission.id;
    missionState.dbMissionId = latestMission.mission_id;
    missionState.status = latestMission.status;
    missionState.elapsedMinutes = latestMission.elapsed_minutes;
    missionState.rewardGranted = latestMission.reward_granted;
  }

  renderAirconStatus();
  renderMissionStatus();
  renderWallet();
  renderShop();
  renderProductDetail();
  renderUserAndReport();
}

async function createUserMissionInSupabase() {
  if (
    !greenonSupabase ||
    !userState.isLoggedIn ||
    !userState.userId ||
    !missionState.dbMissionId ||
    missionState.status !== "running"
  ) {
    return;
  }

  const { data, error } = await greenonSupabase
    .from("user_missions")
    .insert({
      user_id: userState.userId,
      mission_id: missionState.dbMissionId,
      status: "running",
      elapsed_minutes: 0,
      reward_granted: false,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    setAuthMessage(`미션 기록 생성 실패: ${error.message}`, true);
    return;
  }

  missionState.userMissionId = data.id;
}

function saveMissionProgressToSupabase() {
  if (!greenonSupabase || !missionState.userMissionId) {
    return;
  }

  greenonSupabase
    .from("user_missions")
    .update({
      status: missionState.status,
      elapsed_minutes: missionState.elapsedMinutes,
      reward_granted: missionState.rewardGranted,
      completed_at:
        missionState.status === "success" || missionState.status === "failed"
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", missionState.userMissionId)
    .then(({ error }) => {
      if (error) {
        setAuthMessage(`미션 진행 저장 실패: ${error.message}`, true);
      }
    });
}

function saveMissionRewardToSupabase() {
  if (!greenonSupabase || !userState.isLoggedIn || !userState.userId) {
    return;
  }

  Promise.all([
    greenonSupabase.from("point_transactions").insert({
      user_id: userState.userId,
      user_mission_id: missionState.userMissionId || null,
      transaction_type: "earn",
      title: "26°C 유지 냉방 미션 성공",
      amount: missionState.rewardPoint,
    }),
    greenonSupabase
      .from("profiles")
      .update({
        total_points: walletState.point,
        green_level: getGreenLevel().level,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userState.userId),
  ]).then((results) => {
    const failedResult = results.find((result) => result.error);

    if (failedResult) {
      setAuthMessage(`포인트 저장 실패: ${failedResult.error.message}`, true);
      return;
    }

    saveMissionProgressToSupabase();
  });
}

function renderProductCard(reward) {
  const rewardCard = document.createElement("article");
  rewardCard.className = "product-card";
  rewardCard.innerHTML = `
    <div class="product-thumb" aria-hidden="true">${getProductImageLabel(reward)}</div>
    <div class="product-meta">
      <span class="reward-category">${reward.category}</span>
      <span class="reward-price">${formatPoint(reward.price)}</span>
    </div>
    <h3>${reward.name}</h3>
    <p>${reward.description}</p>
    <div class="product-actions">
      <button class="secondary-button" type="button" data-view-reward="${reward.id}">
        상세보기
      </button>
    </div>
  `;
  return rewardCard;
}

function renderShop() {
  const rewardList = document.querySelector("#reward-list");
  const orderHistory = document.querySelector("#order-history");
  const selectedCategory = shopState.selectedCategory;
  const filteredRewards = shopState.rewards.filter((reward) => {
    return selectedCategory === "ALL" || reward.category === selectedCategory;
  });

  document.querySelector("#shop-point-pill").textContent = formatPoint(walletState.point);
  rewardList.innerHTML = "";

  filteredRewards.forEach((reward) => {
    rewardList.append(renderProductCard(reward));
  });

  document.querySelector("#order-count").textContent = `${shopState.orders.length}건`;
  renderOrderHistory(orderHistory);
  bindProductButtons();
}

function renderOrderHistory(orderHistory) {
  orderHistory.innerHTML = "";

  if (shopState.orders.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-history";
    emptyItem.textContent = "아직 구매한 리워드가 없습니다.";
    orderHistory.append(emptyItem);
    return;
  }

  shopState.orders.forEach((order) => {
    const item = document.createElement("li");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${order.rewardName}</strong>
        <span>${order.createdAt}</span>
      </div>
      <span class="history-point is-spend">-${formatPoint(order.price)}</span>
    `;
    orderHistory.append(item);
  });
}

function bindProductButtons() {
  document.querySelectorAll("[data-view-reward]").forEach((button) => {
    button.addEventListener("click", () => {
      openProductDetail(button.dataset.viewReward);
    });
  });
}

function renderProductDetail() {
  const detailContent = document.querySelector("#product-detail-content");
  if (!detailContent || !shopState.selectedProductId) {
    return;
  }

  const reward = getRewardById(shopState.selectedProductId);
  if (!reward) {
    detailContent.innerHTML = `
      <div class="detail-alert is-danger">상품을 찾을 수 없습니다.</div>
    `;
    return;
  }

  const hasEnoughPoint = walletState.point >= reward.price;
  detailContent.innerHTML = `
    <div class="product-detail-media" aria-hidden="true">${getProductImageLabel(reward)}</div>
    <div class="product-detail-info">
      <span class="reward-category">${reward.category}</span>
      <h2>${reward.name}</h2>
      <p>${getProductDetailText(reward)}</p>
      <div class="detail-price-box">
        <span>필요 GREEN POINT</span>
        <strong>${formatPoint(reward.price)}</strong>
      </div>
      <div class="detail-price-box">
        <span>현재 보유 GREEN POINT</span>
        <strong>${formatPoint(walletState.point)}</strong>
      </div>
      <div class="detail-alert ${hasEnoughPoint ? "" : "is-danger"}" role="status">
        ${
          hasEnoughPoint
            ? "포인트가 충분합니다. GREEN POINT로 구매할 수 있습니다."
            : "포인트가 부족합니다"
        }
      </div>
      <button
        class="primary-button"
        type="button"
        id="detail-buy-button"
        ${hasEnoughPoint ? "" : "disabled"}
      >
        GREEN POINT로 구매
      </button>
    </div>
  `;

  const detailBuyButton = document.querySelector("#detail-buy-button");
  if (detailBuyButton) {
    detailBuyButton.addEventListener("click", async () => {
      await buyReward(reward.id);
      renderProductDetail();
    });
  }
}

document.querySelector("#back-to-shop-button").addEventListener("click", () => {
  showScreen("shop");
});

function setShopAlert(message, isDanger = false) {
  const alert = document.querySelector("#shop-alert");
  alert.textContent = message;
  alert.classList.toggle("is-danger", isDanger);
}

async function buyReward(rewardId) {
  const reward = getRewardById(rewardId);

  if (!reward) {
    return;
  }

  if (walletState.point < reward.price) {
    setShopAlert("포인트가 부족합니다. 미션을 성공해 GREEN POINT를 더 모아주세요.", true);
    return;
  }

  walletState.point -= reward.price;
  const localOrder = {
    id: `order-${Date.now()}-${shopState.orders.length}`,
    rewardId: reward.id,
    rewardName: reward.name,
    price: reward.price,
    createdAt: new Date().toLocaleString("ko-KR"),
  };

  shopState.orders.unshift(localOrder);
  addPointTransaction("spend", reward.name, reward.price);

  if (greenonSupabase && userState.isLoggedIn && userState.userId && isUuid(reward.id)) {
    const [{ error: orderError }, { error: transactionError }, { error: profileError }] =
      await Promise.all([
        greenonSupabase.from("reward_orders").insert({
          user_id: userState.userId,
          reward_id: reward.id,
          point_spent: reward.price,
          status: "purchased",
        }),
        greenonSupabase.from("point_transactions").insert({
          user_id: userState.userId,
          transaction_type: "spend",
          title: reward.name,
          amount: reward.price,
        }),
        greenonSupabase
          .from("profiles")
          .update({
            total_points: walletState.point,
            green_level: getGreenLevel().level,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userState.userId),
      ]);

    const firstError = orderError || transactionError || profileError;

    if (firstError) {
      setShopAlert(`구매 저장 실패: ${firstError.message}`, true);
      return;
    }
  }

  setShopAlert(`${reward.name} 구매가 완료되었습니다.`);
  renderWallet();
  renderShop();
  renderProductDetail();
  renderUserAndReport();
}

document.querySelectorAll("[data-reward-category]").forEach((button) => {
  button.addEventListener("click", () => {
    shopState.selectedCategory = button.dataset.rewardCategory;

    document.querySelectorAll("[data-reward-category]").forEach((categoryButton) => {
      categoryButton.classList.toggle("is-active", categoryButton === button);
    });

    renderShop();
  });
});

function getGreenLevel() {
  const point = walletState.point;

  if (point >= 1500) {
    return {
      level: 4,
      name: "Forest",
      message: "꾸준한 친환경 냉방 습관이 만들어지고 있습니다.",
    };
  }

  if (point >= 900) {
    return {
      level: 3,
      name: "Leaf",
      message: "GREEN POINT 사용과 미션 참여가 안정적으로 이어지고 있습니다.",
    };
  }

  if (point >= 300) {
    return {
      level: 2,
      name: "Seed",
      message: "첫 미션 성공으로 GREEN LEVEL이 성장했습니다.",
    };
  }

  return {
    level: 1,
    name: "Sprout",
    message: "첫 GREEN MISSION을 시작해보세요.",
  };
}

function renderUserAndReport() {
  const greenLevel = getGreenLevel();
  const authPanel = document.querySelector("#auth-panel");
  const profilePanel = document.querySelector("#profile-panel");
  const loginStatePill = document.querySelector("#login-state-pill");
  const savedCarbon = userState.completedMissions * 180;

  authPanel.style.display = userState.isLoggedIn ? "none" : "grid";
  profilePanel.classList.toggle("is-active", userState.isLoggedIn);

  document.querySelector("#my-page-title").textContent = userState.isLoggedIn
    ? `${userState.name}님의 MY PAGE`
    : "로그인 전";
  loginStatePill.textContent = userState.isLoggedIn ? "로그인" : "Guest";
  document.querySelector("#profile-name").textContent = userState.name;
  document.querySelector("#profile-email").textContent = userState.email || "-";

  document.querySelector("#green-level-pill").textContent = `LEVEL ${greenLevel.level}`;
  document.querySelector("#green-level-name").textContent = greenLevel.name;
  document.querySelector("#green-level-message").textContent = greenLevel.message;
  document.querySelector("#report-point").textContent = formatPoint(walletState.point);
  document.querySelector("#report-mission-count").textContent =
    `${userState.completedMissions}회`;
  document.querySelector("#report-order-count").textContent = `${shopState.orders.length}건`;
  document.querySelector("#report-saving").textContent = `${savedCarbon}g CO₂`;
}

function setAuthMessage(message, isDanger = false) {
  const authMessage = document.querySelector("#auth-message");
  authMessage.textContent = message;
  authMessage.classList.toggle("is-danger", isDanger);
}

async function applySupabaseUser(user) {
  userState.isLoggedIn = true;
  userState.userId = user.id;
  userState.email = user.email || "";
  userState.name =
    user.user_metadata?.display_name || user.email?.split("@")[0] || "GreenON 사용자";

  // profiles 테이블은 RLS로 본인 행만 조회됩니다.
  const { data: profile, error } = await greenonSupabase
    .from("profiles")
    .select("display_name, green_level, total_points")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!error && profile?.display_name) {
    userState.name = profile.display_name;
  }

  if (!error && typeof profile?.total_points === "number") {
    walletState.point = profile.total_points;
  }

  await loadPublicSupabaseData();
  await loadUserSupabaseData();
  renderUserAndReport();
}

async function loginWithForm(isSignup) {
  const nameInput = document.querySelector("#auth-name");
  const emailInput = document.querySelector("#auth-email");
  const passwordInput = document.querySelector("#auth-password");
  const inputName = nameInput.value.trim();
  const inputEmail = emailInput.value.trim();
  const inputPassword = passwordInput.value.trim();

  if (greenonSupabase) {
    if (!inputEmail || inputPassword.length < 6) {
      setAuthMessage("이메일과 6자 이상의 비밀번호를 입력해주세요.", true);
      return;
    }

    if (isSignup) {
      const { data, error } = await greenonSupabase.auth.signUp({
        email: inputEmail,
        password: inputPassword,
        options: {
          data: {
            display_name: inputName || "GreenON 사용자",
          },
        },
      });

      if (error) {
        setAuthMessage(error.message, true);
        return;
      }

      if (data.session?.user) {
        await applySupabaseUser(data.session.user);
        setAuthMessage("회원가입과 로그인이 완료되었습니다.");
        return;
      }

      setAuthMessage("회원가입 요청이 완료되었습니다. 이메일 확인이 필요한 설정일 수 있습니다.");
      return;
    }

    const { data, error } = await greenonSupabase.auth.signInWithPassword({
      email: inputEmail,
      password: inputPassword,
    });

    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    await applySupabaseUser(data.user);
    setAuthMessage("로그인이 완료되었습니다.");
    return;
  }

  // Supabase CDN 또는 설정이 없을 때만 쓰는 임시 로그인입니다.
  userState.isLoggedIn = true;
  userState.name = inputName || (isSignup ? "GreenON 사용자" : "체험 사용자");
  userState.email = inputEmail || "guest@carrier-greenon.local";
  renderUserAndReport();
  setAuthMessage("Supabase 설정이 없어 임시 로그인으로 동작했습니다.");
}

document.querySelector("#signup-button").addEventListener("click", () => {
  loginWithForm(true);
});

document.querySelector("#login-button").addEventListener("click", () => {
  loginWithForm(false);
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  if (greenonSupabase) {
    await greenonSupabase.auth.signOut();
  }

  userState.isLoggedIn = false;
  userState.userId = "";
  userState.name = "Guest";
  userState.email = "";
  renderUserAndReport();
  setAuthMessage("로그아웃되었습니다.");
});

function renderWindyMascot() {
  const mascot = document.querySelector("#windy-mascot");
  if (!mascot) {
    return;
  }

  const mouth = mascot.querySelector(".windy-mouth");
  const pupils = mascot.querySelectorAll(".windy-pupil");
  if (mouth) {
    mouth.setAttribute("d", "M103 125c8 8 20 8 28 0");
  }
  pupils.forEach((pupil) => {
    pupil.setAttribute("r", "7");
  });
  mascot.classList.remove("is-running", "is-success", "is-filter", "is-sensor");

  if (airconState.health === "filter") {
    mascot.classList.add("is-filter");
    if (mouth) {
      mouth.setAttribute("d", "M101 130c8-7 23-7 31 0");
    }
    return;
  }

  if (airconState.health === "sensor") {
    mascot.classList.add("is-sensor");
    if (mouth) {
      mouth.setAttribute("d", "M110 124c6 10 14 10 20 0");
    }
    pupils.forEach((pupil) => {
      pupil.setAttribute("r", "5");
    });
    return;
  }

  if (missionState.status === "running") {
    mascot.classList.add("is-running");
    return;
  }

  if (missionState.status === "success") {
    mascot.classList.add("is-success");
  }
}

function triggerWindyPointAnimation() {
  const mascot = document.querySelector("#windy-mascot");
  if (!mascot) {
    return;
  }

  mascot.classList.remove("is-point");
  requestAnimationFrame(() => {
    mascot.classList.add("is-point");
    window.setTimeout(() => mascot.classList.remove("is-point"), 760);
  });
}

function initializePointerInteractions() {
  const mascot = document.querySelector("#windy-mascot");
  const hero = document.querySelector("#hero-panel");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!mascot || !hero || !canHover || reducedMotion) {
    return;
  }

  let mouseX = 0;
  let mouseY = 0;
  let frameId = 0;

  function updateInteraction() {
    frameId = 0;
    const heroRect = hero.getBoundingClientRect();
    const mascotRect = mascot.getBoundingClientRect();
    const heroCenterX = heroRect.left + heroRect.width / 2;
    const heroCenterY = heroRect.top + heroRect.height / 2;
    const mascotCenterX = mascotRect.left + mascotRect.width / 2;
    const mascotCenterY = mascotRect.top + mascotRect.height / 2;
    const dx = mouseX - mascotCenterX;
    const dy = mouseY - mascotCenterY;
    const distance = Math.hypot(dx, dy);
    const eyeX = Math.max(-5, Math.min(5, dx / 28));
    const eyeY = Math.max(-4, Math.min(4, dy / 32));
    const rotate = Math.max(-2, Math.min(2, dx / 180));
    const scale = distance < 190 ? 1.03 : 1;
    const parallaxX = Math.max(-14, Math.min(14, (mouseX - heroCenterX) / 28));
    const parallaxY = Math.max(-10, Math.min(10, (mouseY - heroCenterY) / 34));

    mascot.style.setProperty("--eye-x", `${eyeX}px`);
    mascot.style.setProperty("--eye-y", `${eyeY}px`);
    mascot.style.setProperty("--windy-rotate", `${rotate}deg`);
    mascot.style.setProperty("--windy-scale", String(scale));
    hero.style.setProperty("--parallax-x", `${parallaxX}px`);
    hero.style.setProperty("--parallax-y", `${parallaxY}px`);
  }

  // Interaction concept adapted from MDN Web Docs requestAnimationFrame examples.
  // Modified for Carrier GreenON Windy mascot eye tracking and light hero parallax.
  hero.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;

    if (!frameId) {
      frameId = requestAnimationFrame(updateInteraction);
    }
  });

  hero.addEventListener("mouseleave", () => {
    mascot.style.setProperty("--eye-x", "0px");
    mascot.style.setProperty("--eye-y", "0px");
    mascot.style.setProperty("--windy-rotate", "0deg");
    mascot.style.setProperty("--windy-scale", "1");
    hero.style.setProperty("--parallax-x", "0px");
    hero.style.setProperty("--parallax-y", "0px");
  });
}

async function initializeSupabaseAuth() {
  if (!greenonSupabase) {
    setAuthMessage("Supabase 설정이 없어서 임시 로그인 모드로 실행 중입니다.");
    return;
  }

  await loadPublicSupabaseData();

  const { data, error } = await greenonSupabase.auth.getSession();

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  if (data.session?.user) {
    await applySupabaseUser(data.session.user);
    setAuthMessage("기존 Supabase 세션을 불러왔습니다.");
  } else {
    setAuthMessage("Supabase Auth로 회원가입과 로그인을 진행합니다.");
  }

  greenonSupabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await applySupabaseUser(session.user);
      return;
    }

    userState.isLoggedIn = false;
    userState.userId = "";
    userState.name = "Guest";
    userState.email = "";
    renderUserAndReport();
  });
}

renderAirconStatus();
renderWeather();
renderMissionStatus();
renderWallet();
renderShop();
renderUserAndReport();
initializePointerInteractions();
initializeSupabaseAuth().then(() => {
  handleRoute();
});
