const STORAGE_KEY = "historial-taller-tobar:v1";
const API_ENDPOINT = "/api/records";
const AUTH_ENDPOINT = "/api/auth";
const PHOTOS_ENDPOINT = "/api/photos";

const state = {
  records: [],
  selectedPatent: "",
  search: "",
  storageMode: "checking",
  authRequired: false,
  appStarted: false,
  formPhotos: [],
  pendingPhotos: [],
  photosToDelete: [],
};

const els = {
  protectedAreas: document.querySelectorAll(".app-protected"),
  loginScreen: document.querySelector("#loginScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginUser: document.querySelector("#loginUser"),
  loginPassword: document.querySelector("#loginPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  form: document.querySelector("#recordForm"),
  recordId: document.querySelector("#recordId"),
  formTitle: document.querySelector("#formTitle"),
  formStatus: document.querySelector("#formStatus"),
  clearForm: document.querySelector("#clearForm"),
  newRecordTop: document.querySelector("#newRecordTop"),
  logoutButton: document.querySelector("#logoutButton"),
  searchForm: document.querySelector("#searchForm"),
  searchPatent: document.querySelector("#searchPatent"),
  vehicleList: document.querySelector("#vehicleList"),
  vehicleDetail: document.querySelector("#vehicleDetail"),
  detailTitle: document.querySelector("#detailTitle"),
  upcomingList: document.querySelector("#upcomingList"),
  vehiclesCount: document.querySelector("#vehiclesCount"),
  clientsCount: document.querySelector("#clientsCount"),
  jobsCount: document.querySelector("#jobsCount"),
  upcomingCount: document.querySelector("#upcomingCount"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmText: document.querySelector("#confirmText"),
  storageModeLabel: document.querySelector("#storageModeLabel"),
  storageModeText: document.querySelector("#storageModeText"),
  photoPreview: document.querySelector("#photoPreview"),
};

const fields = {
  clientName: document.querySelector("#clientName"),
  clientPhone: document.querySelector("#clientPhone"),
  clientEmail: document.querySelector("#clientEmail"),
  patent: document.querySelector("#patent"),
  brandName: document.querySelector("#brandName"),
  modelName: document.querySelector("#modelName"),
  vehicleYear: document.querySelector("#vehicleYear"),
  mileage: document.querySelector("#mileage"),
  intakeDate: document.querySelector("#intakeDate"),
  workDone: document.querySelector("#workDone"),
  observations: document.querySelector("#observations"),
  nextMaintenance: document.querySelector("#nextMaintenance"),
  nextMaintenanceDate: document.querySelector("#nextMaintenanceDate"),
  photoFiles: document.querySelector("#photoFiles"),
};

// Repository layer: this is the only place that knows whether data is stored in an API or localStorage.
const recordsRepository = {
  apiAvailable: false,
  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error("No se pudieron cargar los registros", error);
      return [];
    }
  },
  saveLocal(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  },
  async load() {
    try {
      const response = await fetch(API_ENDPOINT, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        handleUnauthorized();
        return [];
      }

      if (!response.ok) throw new Error("API no disponible");

      const payload = await response.json();
      this.apiAvailable = true;
      updateStorageMode("database");
      this.saveLocal(payload.records || []);
      return payload.records || [];
    } catch (error) {
      this.apiAvailable = false;
      updateStorageMode("local");
      return this.loadLocal();
    }
  },
  async upsert(record, allRecords) {
    if (this.apiAvailable) {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ record }),
        credentials: "same-origin",
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Debes ingresar nuevamente.");
      }

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload.error || "No se pudo guardar en la base de datos.");
      }
    }

    this.saveLocal(allRecords);
  },
  async deleteRecord(id, allRecords) {
    if (this.apiAvailable) {
      const response = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Debes ingresar nuevamente.");
      }

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload.error || "No se pudo eliminar el registro.");
      }
    }

    this.saveLocal(allRecords);
  },
  async deleteVehicle(patent, allRecords) {
    if (this.apiAvailable) {
      const response = await fetch(`${API_ENDPOINT}?patent=${encodeURIComponent(patent)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Debes ingresar nuevamente.");
      }

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload.error || "No se pudo eliminar el vehículo.");
      }
    }

    this.saveLocal(allRecords);
  },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function showLogin(message = "") {
  if (!els.loginScreen) return;

  els.loginScreen.hidden = false;
  els.protectedAreas.forEach((area) => {
    area.hidden = true;
  });
  els.loginStatus.textContent = message;
  els.loginPassword.value = "";
  setTimeout(() => els.loginUser.focus(), 0);
}

function showApp() {
  if (els.loginScreen) els.loginScreen.hidden = true;
  els.protectedAreas.forEach((area) => {
    area.hidden = false;
  });
  if (els.logoutButton) els.logoutButton.hidden = !state.authRequired;
}

function handleUnauthorized() {
  state.authRequired = true;
  showLogin("Sesión vencida. Ingresa nuevamente para continuar.");
}

async function checkAuth() {
  try {
    const response = await fetch(AUTH_ENDPOINT, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) throw new Error("Auth no disponible");
    return await response.json();
  } catch (error) {
    // Local previews without Vercel Functions keep working in localStorage mode.
    return { authRequired: false, authenticated: true };
  }
}

async function handleLogin(event) {
  event.preventDefault();
  els.loginStatus.textContent = "Verificando acceso...";

  try {
    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        user: els.loginUser.value.trim(),
        password: els.loginPassword.value,
      }),
    });
    const payload = await safeJson(response);

    if (!response.ok) {
      els.loginStatus.textContent = payload.error || "Usuario o contraseña incorrectos.";
      return;
    }

    state.authRequired = Boolean(payload.authRequired);
    showApp();
    await startApp();
  } catch (error) {
    els.loginStatus.textContent = "No se pudo validar el acceso. Revisa el despliegue en Vercel.";
  }
}

async function handleLogout() {
  try {
    await fetch(AUTH_ENDPOINT, {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
  } catch (error) {
    console.warn("No se pudo cerrar la sesión en servidor", error);
  }

  state.records = [];
  state.selectedPatent = "";
  showLogin("Sesión cerrada.");
}

function updateStorageMode(mode) {
  state.storageMode = mode;

  if (mode === "database") {
    els.storageModeLabel.textContent = "Base de datos";
    els.storageModeText.textContent = "Los registros se guardan en Vercel/Neon y se ven desde cualquier dispositivo.";
    return;
  }

  if (mode === "local") {
    els.storageModeLabel.textContent = "Modo prueba local";
    els.storageModeText.textContent = "Sin base de datos activa: los registros quedan solo en este navegador.";
    return;
  }

  els.storageModeLabel.textContent = "Conectando";
  els.storageModeText.textContent = "Verificando conexión con la base de datos.";
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePatent(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatPatent(value) {
  const clean = normalizePatent(value);
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, clean.length - 2)}-${clean.slice(-2)}`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Sin dato";
  return new Intl.NumberFormat("es-CL").format(number);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePhotos(photos = []) {
  return photos
    .filter((photo) => photo?.url)
    .map((photo) => ({
      id: photo.id || createId(),
      url: photo.url,
      pathname: photo.pathname || "",
      name: photo.name || "foto-revision.jpg",
      size: Number(photo.size || 0),
      contentType: photo.contentType || "image/jpeg",
      uploadedAt: photo.uploadedAt || new Date().toISOString(),
    }));
}

function clearPendingPhotos() {
  state.pendingPhotos.forEach((photo) => {
    if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
  });
  state.pendingPhotos = [];
  if (fields.photoFiles) fields.photoFiles.value = "";
}

function resetPhotoState(photos = []) {
  clearPendingPhotos();
  state.formPhotos = normalizePhotos(photos);
  state.photosToDelete = [];
  renderPhotoPreview();
}

function renderPhotoPreview() {
  if (!els.photoPreview) return;

  const existingTiles = state.formPhotos.map((photo) => renderPhotoTile(photo, "existing", photo.url));
  const pendingTiles = state.pendingPhotos.map((photo) => renderPhotoTile(photo, "pending", photo.previewUrl));
  const tiles = [...existingTiles, ...pendingTiles];

  els.photoPreview.innerHTML = tiles.length ? tiles.join("") : "";
}

function renderPhotoTile(photo, kind, src) {
  return `
    <article class="photo-tile">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(photo.name || "Foto de revisión")}" loading="lazy" />
      <button type="button" data-action="remove-form-photo" data-kind="${kind}" data-id="${escapeHtml(photo.id)}" aria-label="Quitar foto">×</button>
      <span>${escapeHtml(photo.name || "Foto de revisión")}</span>
    </article>
  `;
}

function removeFormPhoto(kind, id) {
  if (kind === "pending") {
    const photo = state.pendingPhotos.find((item) => item.id === id);
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    state.pendingPhotos = state.pendingPhotos.filter((item) => item.id !== id);
  }

  if (kind === "existing") {
    const photo = state.formPhotos.find((item) => item.id === id);
    if (photo) state.photosToDelete.push(photo);
    state.formPhotos = state.formPhotos.filter((item) => item.id !== id);
  }

  renderPhotoPreview();
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer una de las fotos."));
    };
    image.src = url;
  });
}

async function compressImage(file) {
  const image = await loadImage(file);
  const maxSize = 1600;
  const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir una de las fotos."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.78
    );
  });
}

async function handlePhotoSelection(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;

  els.formStatus.textContent = "Preparando fotos...";

  try {
    for (const file of files) {
      const blob = await compressImage(file);
      state.pendingPhotos.push({
        id: createId(),
        name: file.name.replace(/\.[^.]+$/, ".jpg"),
        size: blob.size,
        contentType: "image/jpeg",
        blob,
        previewUrl: URL.createObjectURL(blob),
      });
    }

    renderPhotoPreview();
    els.formStatus.textContent = "";
  } catch (error) {
    els.formStatus.textContent = error.message;
  } finally {
    fields.photoFiles.value = "";
  }
}

async function uploadPendingPhotos(recordId) {
  if (!state.pendingPhotos.length) return [];
  if (!recordsRepository.apiAvailable) {
    throw new Error("Para guardar fotos, despliega la versión 2 en Vercel con Vercel Blob activo.");
  }

  const uploaded = [];

  for (const photo of state.pendingPhotos) {
    const response = await fetch(PHOTOS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": photo.contentType,
        "X-Record-Id": encodeURIComponent(recordId),
        "X-File-Name": encodeURIComponent(photo.name),
      },
      credentials: "same-origin",
      body: photo.blob,
    });
    const payload = await safeJson(response);

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Debes ingresar nuevamente.");
    }

    if (!response.ok) {
      throw new Error(payload.error || "No se pudo subir una foto.");
    }

    uploaded.push(payload.photo);
  }

  clearPendingPhotos();
  return normalizePhotos(uploaded);
}

async function deleteStoredPhotos(photos = []) {
  const urls = photos.map((photo) => photo?.url).filter(Boolean);
  if (!urls.length || !recordsRepository.apiAvailable) return;

  await Promise.allSettled(
    urls.map((url) =>
      fetch(PHOTOS_ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ url }),
      })
    )
  );
}

function renderPhotoGrid(photos = []) {
  const items = normalizePhotos(photos);
  if (!items.length) return "";

  return `
    <div class="photo-grid">
      ${items
        .map(
          (photo) => `
            <article class="photo-tile">
              <a href="${escapeHtml(photo.url)}" target="_blank" rel="noopener">
                <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name || "Foto de revisión")}" loading="lazy" />
              </a>
              <span>${escapeHtml(photo.name || "Foto de revisión")}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getFormData() {
  const patentNormalized = normalizePatent(fields.patent.value);

  return {
    id: els.recordId.value || createId(),
    clientName: fields.clientName.value.trim(),
    clientPhone: fields.clientPhone.value.trim(),
    clientEmail: fields.clientEmail.value.trim(),
    patentNormalized,
    patentDisplay: formatPatent(patentNormalized),
    brandName: fields.brandName.value.trim(),
    modelName: fields.modelName.value.trim(),
    vehicleYear: fields.vehicleYear.value.trim(),
    mileage: fields.mileage.value.trim(),
    intakeDate: fields.intakeDate.value,
    workDone: fields.workDone.value.trim(),
    observations: fields.observations.value.trim(),
    nextMaintenance: fields.nextMaintenance.value.trim(),
    nextMaintenanceDate: fields.nextMaintenanceDate.value,
    photos: normalizePhotos(state.formPhotos),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function setFormData(record) {
  els.recordId.value = record.id || "";
  fields.clientName.value = record.clientName || "";
  fields.clientPhone.value = record.clientPhone || "";
  fields.clientEmail.value = record.clientEmail || "";
  fields.patent.value = record.patentDisplay || record.patentNormalized || "";
  fields.brandName.value = record.brandName || "";
  fields.modelName.value = record.modelName || "";
  fields.vehicleYear.value = record.vehicleYear || "";
  fields.mileage.value = record.mileage || "";
  fields.intakeDate.value = record.intakeDate || today();
  fields.workDone.value = record.workDone || "";
  fields.observations.value = record.observations || "";
  fields.nextMaintenance.value = record.nextMaintenance || "";
  fields.nextMaintenanceDate.value = record.nextMaintenanceDate || "";
  resetPhotoState(record.photos || []);
  els.formTitle.textContent = record.id ? "Editar registro existente" : "Registrar vehículo o trabajo";
}

function clearForm(prefill = {}) {
  setFormData({
    id: "",
    intakeDate: today(),
    ...prefill,
  });
  els.formStatus.textContent = "";
  fields.clientName.focus();
}

function getVehicleGroups() {
  const groups = new Map();

  state.records.forEach((record) => {
    if (!groups.has(record.patentNormalized)) {
      groups.set(record.patentNormalized, []);
    }
    groups.get(record.patentNormalized).push(record);
  });

  return Array.from(groups.entries())
    .map(([patent, records]) => {
      const sorted = [...records].sort(compareRecordsDesc);
      return {
        patent,
        latest: sorted[0],
        records: sorted,
      };
    })
    .sort((a, b) => compareRecordsDesc(a.latest, b.latest));
}

function compareRecordsDesc(a, b) {
  const dateA = `${a.intakeDate || ""} ${a.updatedAt || ""}`;
  const dateB = `${b.intakeDate || ""} ${b.updatedAt || ""}`;
  return dateB.localeCompare(dateA);
}

function getFilteredGroups() {
  const query = normalizePatent(state.search);
  const groups = getVehicleGroups();
  if (!query) return groups;

  return groups.filter((group) => {
    const latest = group.latest;
    return (
      group.patent.includes(query) ||
      (latest.clientName || "").toUpperCase().includes(state.search.toUpperCase()) ||
      (latest.brandName || "").toUpperCase().includes(state.search.toUpperCase()) ||
      (latest.modelName || "").toUpperCase().includes(state.search.toUpperCase())
    );
  });
}

function renderDashboard() {
  const groups = getVehicleGroups();
  const clients = new Set(state.records.map((record) => record.clientName.trim().toUpperCase()).filter(Boolean));
  const upcoming = state.records.filter((record) => record.nextMaintenance || record.nextMaintenanceDate);

  els.vehiclesCount.textContent = groups.length;
  els.clientsCount.textContent = clients.size;
  els.jobsCount.textContent = state.records.length;
  els.upcomingCount.textContent = upcoming.length;
}

function renderVehicleList() {
  const groups = getFilteredGroups();

  if (!groups.length) {
    els.vehicleList.innerHTML = `
      <div class="empty-state">
        <p>No hay vehículos registrados para esta búsqueda.</p>
      </div>
    `;
    return;
  }

  els.vehicleList.innerHTML = groups
    .map(({ patent, latest, records }) => {
      const selected = state.selectedPatent === patent ? " Seleccionado" : "";
      const vehicleName = [latest.brandName, latest.modelName, latest.vehicleYear].filter(Boolean).join(" ") || "Vehículo sin detalle";
      return `
        <article class="vehicle-card" data-patent="${escapeHtml(patent)}">
          <div class="vehicle-main">
            <div>
              <span class="plate">${escapeHtml(latest.patentDisplay || patent)}</span>
              <h3>${escapeHtml(vehicleName)}${selected ? `<span class="sr-only">${selected}</span>` : ""}</h3>
              <div class="meta-line">
                <span>${escapeHtml(latest.clientName || "Cliente sin nombre")}</span>
                <span>${formatNumber(latest.mileage)} km</span>
                <span>${records.length} trabajo${records.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>
          <div class="card-actions">
            <button class="mini-button" type="button" data-action="view" data-patent="${escapeHtml(patent)}">Ver ficha</button>
            <button class="mini-button" type="button" data-action="new-work" data-patent="${escapeHtml(patent)}">Nuevo trabajo</button>
            <button class="mini-button danger" type="button" data-action="delete-vehicle" data-patent="${escapeHtml(patent)}">Eliminar vehículo</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDetail() {
  const group = getVehicleGroups().find((item) => item.patent === state.selectedPatent);

  if (!group) {
    els.detailTitle.textContent = "Selecciona un vehículo";
    els.vehicleDetail.className = "empty-state";
    els.vehicleDetail.innerHTML = "<p>Busca o selecciona una patente para ver datos del cliente, vehículo e historial de trabajos.</p>";
    return;
  }

  const latest = group.latest;
  const vehicleName = [latest.brandName, latest.modelName, latest.vehicleYear].filter(Boolean).join(" ") || "Vehículo sin detalle";
  const photoCount = group.records.reduce((total, record) => total + normalizePhotos(record.photos).length, 0);
  els.detailTitle.textContent = latest.patentDisplay || group.patent;
  els.vehicleDetail.className = "";
  els.vehicleDetail.innerHTML = `
    <div class="detail-summary">
      <div class="data-box">
        <span>Cliente</span>
        <strong>${escapeHtml(latest.clientName || "Sin dato")}</strong>
      </div>
      <div class="data-box">
        <span>Contacto</span>
        <strong>${escapeHtml(latest.clientPhone || latest.clientEmail || "Sin dato")}</strong>
      </div>
      <div class="data-box">
        <span>Vehículo</span>
        <strong>${escapeHtml(vehicleName)}</strong>
      </div>
      <div class="data-box">
        <span>Último kilometraje</span>
        <strong>${formatNumber(latest.mileage)} km</strong>
      </div>
      <div class="data-box">
        <span>Fotos</span>
        <strong>${formatNumber(photoCount)}</strong>
      </div>
    </div>
    <div class="history-list">
      ${group.records.map(renderHistoryCard).join("")}
    </div>
  `;
}

function renderHistoryCard(record) {
  return `
    <article class="history-card">
      <div class="history-head">
        <div>
          <span class="plate">${escapeHtml(record.patentDisplay || record.patentNormalized)}</span>
          <h3>${formatDate(record.intakeDate)} · ${formatNumber(record.mileage)} km</h3>
        </div>
        <div class="card-actions">
          <button class="mini-button" type="button" data-action="edit-record" data-id="${escapeHtml(record.id)}">Editar</button>
          <button class="mini-button danger" type="button" data-action="delete-record" data-id="${escapeHtml(record.id)}">Eliminar</button>
        </div>
      </div>
      <div class="history-body">
        <p><strong>Trabajos:</strong> ${escapeHtml(record.workDone || "Sin detalle")}</p>
        <p><strong>Observaciones:</strong> ${escapeHtml(record.observations || "Sin observaciones")}</p>
        <p><strong>Próxima mantención:</strong> ${escapeHtml(record.nextMaintenance || "Sin sugerencia")}${record.nextMaintenanceDate ? ` · ${formatDate(record.nextMaintenanceDate)}` : ""}</p>
        ${renderPhotoGrid(record.photos)}
      </div>
    </article>
  `;
}

function renderUpcoming() {
  const records = state.records
    .filter((record) => record.nextMaintenance || record.nextMaintenanceDate)
    .sort((a, b) => (a.nextMaintenanceDate || "9999-12-31").localeCompare(b.nextMaintenanceDate || "9999-12-31"));

  if (!records.length) {
    els.upcomingList.innerHTML = `
      <div class="empty-state">
        <p>Aún no hay próximas mantenciones sugeridas.</p>
      </div>
    `;
    return;
  }

  els.upcomingList.innerHTML = records
    .map((record) => {
      const vehicleName = [record.brandName, record.modelName].filter(Boolean).join(" ") || "Vehículo";
      return `
        <article class="maintenance-card">
          <div>
            <span class="plate">${escapeHtml(record.patentDisplay || record.patentNormalized)}</span>
            <h3>${escapeHtml(vehicleName)} · ${formatDate(record.nextMaintenanceDate)}</h3>
            <p>${escapeHtml(record.nextMaintenance || "Mantención sugerida sin detalle")}</p>
          </div>
          <button class="mini-button" type="button" data-action="view" data-patent="${escapeHtml(record.patentNormalized)}">Ver ficha</button>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderDashboard();
  renderVehicleList();
  renderDetail();
  renderUpcoming();
}

async function saveRecord(event) {
  event.preventDefault();

  const data = getFormData();
  if (!data.patentNormalized) {
    els.formStatus.textContent = "Ingresa una patente válida.";
    return;
  }

  try {
    const existingIndex = state.records.findIndex((record) => record.id === data.id);
    const uploadedPhotos = await uploadPendingPhotos(data.id);
    state.formPhotos = normalizePhotos([...state.formPhotos, ...uploadedPhotos]);
    data.photos = normalizePhotos(state.formPhotos);

    if (existingIndex >= 0) {
      data.createdAt = state.records[existingIndex].createdAt;
      state.records[existingIndex] = data;
      var statusMessage = "Registro actualizado.";
    } else {
      state.records.unshift(data);
      var statusMessage = "Registro guardado.";
    }

    els.formStatus.textContent = uploadedPhotos.length ? "Guardando registro con fotos..." : "Guardando...";
    await recordsRepository.upsert(data, state.records);
    await deleteStoredPhotos(state.photosToDelete);
    state.photosToDelete = [];
    state.selectedPatent = data.patentNormalized;
    clearForm();
    els.formStatus.textContent = statusMessage;
    state.selectedPatent = data.patentNormalized;
    render();
    document.querySelector("#vehiculos").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    els.formStatus.textContent = error.message;
    state.records = await recordsRepository.load();
    data.photos = normalizePhotos(state.formPhotos);
    render();
  }
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  setFormData(record);
  state.selectedPatent = record.patentNormalized;
  render();
  document.querySelector("#nuevo-ingreso").scrollIntoView({ behavior: "smooth", block: "start" });
}

function prefillNewWork(patent) {
  const group = getVehicleGroups().find((item) => item.patent === patent);
  if (!group) return;

  const latest = group.latest;
  clearForm({
    clientName: latest.clientName,
    clientPhone: latest.clientPhone,
    clientEmail: latest.clientEmail,
    patentDisplay: latest.patentDisplay,
    patentNormalized: latest.patentNormalized,
    brandName: latest.brandName,
    modelName: latest.modelName,
    vehicleYear: latest.vehicleYear,
    intakeDate: today(),
  });
  fields.mileage.focus();
  document.querySelector("#nuevo-ingreso").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  confirmAction(
    "Eliminar registro",
    `Se eliminará el trabajo del ${formatDate(record.intakeDate)} para la patente ${record.patentDisplay}.`,
    async () => {
      const previousRecords = [...state.records];
      state.records = state.records.filter((item) => item.id !== id);
      if (!state.records.some((item) => item.patentNormalized === state.selectedPatent)) {
        state.selectedPatent = "";
      }
      try {
        await recordsRepository.deleteRecord(id, state.records);
        await deleteStoredPhotos(record.photos);
        render();
      } catch (error) {
        state.records = previousRecords;
        els.formStatus.textContent = error.message;
        render();
      }
    }
  );
}

function deleteVehicle(patent) {
  const group = getVehicleGroups().find((item) => item.patent === patent);
  if (!group) return;

  confirmAction(
    "Eliminar vehículo",
    `Se eliminarán todos los registros asociados a la patente ${group.latest.patentDisplay}.`,
    async () => {
      const previousRecords = [...state.records];
      const photosToDelete = group.records.flatMap((record) => normalizePhotos(record.photos));
      state.records = state.records.filter((item) => item.patentNormalized !== patent);
      if (state.selectedPatent === patent) state.selectedPatent = "";
      try {
        await recordsRepository.deleteVehicle(patent, state.records);
        await deleteStoredPhotos(photosToDelete);
        render();
      } catch (error) {
        state.records = previousRecords;
        els.formStatus.textContent = error.message;
        render();
      }
    }
  );
}

function confirmAction(title, text, onConfirm) {
  els.confirmTitle.textContent = title;
  els.confirmText.textContent = text;

  const handler = (event) => {
    els.confirmDialog.removeEventListener("close", handler);
    if (event.target.returnValue === "confirm") onConfirm();
  };

  els.confirmDialog.addEventListener("close", handler);
  if (typeof els.confirmDialog.showModal === "function") {
    els.confirmDialog.showModal();
  } else if (window.confirm(`${title}\n\n${text}`)) {
    els.confirmDialog.removeEventListener("close", handler);
    onConfirm();
  }
}

function handleDelegatedAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const patent = button.dataset.patent;
  const id = button.dataset.id;

  if (action === "remove-form-photo") {
    removeFormPhoto(button.dataset.kind, id);
    return;
  }

  if (action === "view") {
    state.selectedPatent = patent;
    render();
    document.querySelector(".detail-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (action === "new-work") prefillNewWork(patent);
  if (action === "delete-vehicle") deleteVehicle(patent);
  if (action === "edit-record") editRecord(id);
  if (action === "delete-record") deleteRecord(id);
}

function handleSearch(event) {
  event.preventDefault();
  state.search = els.searchPatent.value.trim();

  const exact = getVehicleGroups().find((group) => group.patent === normalizePatent(state.search));
  if (exact) state.selectedPatent = exact.patent;

  render();
}

async function startApp() {
  updateStorageMode("checking");
  state.records = await recordsRepository.load();
  fields.intakeDate.value = today();

  if (!state.appStarted) {
    els.form.addEventListener("submit", saveRecord);
    els.clearForm.addEventListener("click", () => clearForm());
    els.newRecordTop.addEventListener("click", () => {
      clearForm();
      document.querySelector("#nuevo-ingreso").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.logoutButton.addEventListener("click", handleLogout);
    els.searchForm.addEventListener("submit", handleSearch);
    els.searchPatent.addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      renderVehicleList();
    });
    fields.photoFiles.addEventListener("change", handlePhotoSelection);
    document.addEventListener("click", handleDelegatedAction);
    state.appStarted = true;
  }

  render();
}

async function init() {
  if (els.loginForm) {
    els.loginForm.addEventListener("submit", handleLogin);
  }

  const auth = await checkAuth();
  state.authRequired = Boolean(auth.authRequired);

  if (state.authRequired && !auth.authenticated) {
    showLogin();
    return;
  }

  showApp();
  await startApp();
}

init();
