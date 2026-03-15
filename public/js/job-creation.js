document.addEventListener("DOMContentLoaded", () => {
  const pageLoader = document.getElementById("pageLoader");
  setTimeout(() => pageLoader.classList.add("hidden"), 400);

  // ── Device detection ──
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1;

  if (isMobile) {
    document
      .getElementById("main_camera")
      .setAttribute("capture", "environment");
    document.getElementById("wh_camera").setAttribute("capture", "environment");
  }

  // ── Element refs ──
  const barcodeInput = document.getElementById("barcode");
  const itemDetailsExisting = document.getElementById("itemDetailsExisting");
  const itemDetailsNew = document.getElementById("itemDetailsNew");
  const itemMissingInput = document.getElementById("item_missing");
  const itemId = document.getElementById("item_id");
  const division = document.getElementById("division");
  const section = document.getElementById("section");
  const department = document.getElementById("department");
  const itemRemarksInput = document.getElementById("item_remarks");

  // Display fields (readonly visible) — Style, Color, Size, RSP
  const category2Display = document.getElementById("category2_display");
  const category3Display = document.getElementById("category3_display");
  const category4Display = document.getElementById("category4_display");
  const rspDisplay = document.getElementById("rsp_display");

  // Hidden fields for form submission of new columns
  const category2Hidden = document.getElementById("category2");
  const category3Hidden = document.getElementById("category3");
  const category4Hidden = document.getElementById("category4");
  const rspHidden = document.getElementById("rsp");

  const damageReasonSelect = document.getElementById("damage_reason");
  const damageOtherWrap = document.getElementById("damageOtherWrap");
  const deliveryDateInput = document.getElementById("delivery_date");

  const customerNumberInput = document.getElementById("customer_number");
  const customerMissingInput = document.getElementById("customer_missing");
  const customerRemarksWrapper = document.getElementById(
    "customerRemarksWrapper",
  );
  const customerFoundBadge = document.getElementById("customerFoundBadge");
  const customerNotFoundBadge = document.getElementById(
    "customerNotFoundBadge",
  );
  const customerNameInput = document.getElementById("customer_name");
  const emailInput = document.getElementById("email");
  const pincodeInput = document.getElementById("pincode");
  const cityInput = document.getElementById("city");
  const stateInput = document.getElementById("state");
  const addressInput = document.getElementById("address");
  const whatsappOkSelect = document.getElementById("whatsapp_ok");
  const smsOkSelect = document.getElementById("sms_ok");
  const customerRemarksInput = document.getElementById("customer_remarks");

  const jobTypeSelect = document.getElementById("jobType");
  const warehouseSection = document.getElementById("warehouseSection");
  const warehouseIdSelect = document.getElementById("warehouse_id");
  const warehouseNameHidden = document.getElementById("warehouse_name");
  const additionalStepBadge = document.getElementById("additionalStepBadge");

  const jobForm = document.getElementById("jobForm");
  const jobError = document.getElementById("jobError");
  const jobSuccess = document.getElementById("jobSuccess");

  // ── Hidden OTP fields ──
  const verifiedOtpInput = document.getElementById("verified_otp");
  const preGeneratedJobIdInput = document.getElementById(
    "pre_generated_job_id",
  );

  // ── Toast refs ──
  const toastEl = document.getElementById("toast");
  const toastMsgEl = document.getElementById("toastMessage");

  // ── Main attachment ──
  const fileInput = document.getElementById("attachment");
  const mainCameraBtn = document.getElementById("mainCameraBtn");
  const mainCameraInput = document.getElementById("main_camera");
  const attachPreviewWrap = document.getElementById("attachPreviewWrap");
  const attachPreview = document.getElementById("attachPreview");
  const fileLabel = document.getElementById("fileLabel");
  const clearAttachBtn = document.getElementById("clearAttach");

  // ── WH attachment ──
  const whFileInput = document.getElementById("wh_attachment");
  const whCameraBtn = document.getElementById("whCameraBtn");
  const whCameraInput = document.getElementById("wh_camera");
  const whPreviewWrap = document.getElementById("whPreviewWrap");
  const whPreview = document.getElementById("whPreview");
  const whFileLabel = document.getElementById("whFileLabel");
  const clearWhAttachBtn = document.getElementById("clearWhAttach");

  // ── Webcam modal ──
  const webcamModal = document.getElementById("webcamModal");
  const webcamVideo = document.getElementById("webcamVideo");
  const webcamCanvas = document.getElementById("webcamCanvas");
  const snapBtn = document.getElementById("snapBtn");
  const retakeBtn = document.getElementById("retakeBtn");
  const usePhotoBtn = document.getElementById("usePhotoBtn");
  const closeWebcamBtn = document.getElementById("closeWebcam");

  // ── OTP modal refs ──
  const otpModal = document.getElementById("otpModal");
  const otpPhoneDisplay = document.getElementById("otpPhoneDisplay");
  const otpTimerEl = document.getElementById("otpTimer");
  const otpModalInput = document.getElementById("otpModalInput");
  const otpVerifyStatus = document.getElementById("otpVerifyStatus");
  const resendOtpBtn = document.getElementById("resendOtpBtn");
  const confirmCreateJobBtn = document.getElementById("confirmCreateJobBtn");
  const closeOtpModalBtn = document.getElementById("closeOtpModal");

  let webcamStream = null;
  let capturedBlob = null;
  let activeTargetInput = null;
  let activePreviewWrap = null;
  let activePreviewImg = null;
  let activeLabelEl = null;

  // OTP state
  let otpTimerInterval = null;
  let otpSeconds = 300;
  let otpVerified = false;
  let pendingJobId = null;

  // ── Min delivery date ──
  deliveryDateInput.min = new Date().toISOString().split("T")[0];

  // ── Default: Store Repair selected, focus barcode ──
  jobTypeSelect.value = "Store Repair";
  warehouseSection.classList.add("hidden");
  additionalStepBadge.textContent = "4";
  setTimeout(() => barcodeInput.focus(), 500);

  // ────────────────────────────────────────────────
  // TOAST
  // ────────────────────────────────────────────────
  function showToast(message) {
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = message;
    toastEl.classList.remove("hidden");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toastEl.classList.add("show"));
    });
    setTimeout(() => {
      toastEl.classList.remove("show");
      setTimeout(() => toastEl.classList.add("hidden"), 300);
    }, 3500);
  }

  // ────────────────────────────────────────────────
  // MESSAGES
  // ────────────────────────────────────────────────
  const showError = (msg) => {
    jobError.textContent = msg;
    jobError.style.display = "block";
    jobSuccess.style.display = "none";
  };
  const showSuccess = (msg) => {
    jobSuccess.textContent = msg;
    jobSuccess.style.display = "block";
    jobError.style.display = "none";
  };
  const clearMsgs = () => {
    jobError.style.display = "none";
    jobSuccess.style.display = "none";
  };

  // ────────────────────────────────────────────────
  // FIELD ERRORS
  // ────────────────────────────────────────────────
  const setFieldError = (el, msg) => {
    el.style.borderColor = "#e53e3e";
    el.style.boxShadow = "0 0 0 2px rgba(229,62,62,0.15)";
    let errEl = el.parentElement.querySelector(".field-err");
    if (!errEl) {
      errEl = document.createElement("div");
      errEl.className = "field-err";
      el.parentElement.appendChild(errEl);
    }
    errEl.textContent = msg;
    const onInput = () => {
      clearFieldError(el);
      el.removeEventListener("input", onInput);
    };
    el.addEventListener("input", onInput);
  };

  const clearFieldError = (el) => {
    el.style.borderColor = "";
    el.style.boxShadow = "";
    const e = el.parentElement.querySelector(".field-err");
    if (e) e.remove();
  };

  // ────────────────────────────────────────────────
  // PREVIEW
  // ────────────────────────────────────────────────
  function showPreview(file, previewWrap, previewImg, labelEl) {
    if (!file) return;
    labelEl.textContent = file.name;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewImg.style.display = "";
        previewWrap.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.style.display = "none";
      previewWrap.classList.remove("hidden");
    }
  }

  function clearAttach(
    fileInputEl,
    cameraInputEl,
    previewWrap,
    previewImg,
    labelEl,
  ) {
    fileInputEl.value = "";
    cameraInputEl.value = "";
    previewImg.src = "";
    previewImg.style.display = "";
    previewWrap.classList.add("hidden");
    labelEl.textContent = "No file chosen";
  }

  function copyToNamedInput(file, targetInput) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      targetInput.files = dt.files;
    } catch (e) {
      console.warn("DataTransfer not supported:", e);
    }
  }

  // ────────────────────────────────────────────────
  // WEBCAM
  // ────────────────────────────────────────────────
  async function openWebcam(targetInput, previewWrap, previewImg, labelEl) {
    activeTargetInput = targetInput;
    activePreviewWrap = previewWrap;
    activePreviewImg = previewImg;
    activeLabelEl = labelEl;
    capturedBlob = null;

    webcamCanvas.style.display = "none";
    webcamVideo.style.display = "block";
    snapBtn.classList.remove("hidden");
    retakeBtn.classList.add("hidden");
    usePhotoBtn.classList.add("hidden");

    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      webcamVideo.srcObject = webcamStream;
      webcamModal.classList.remove("hidden");
    } catch (err) {
      alert(
        "Could not access webcam.\nPlease allow camera permission or use 'Choose File' instead.",
      );
      console.error("Webcam error:", err);
    }
  }

  function stopWebcam() {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      webcamStream = null;
    }
    webcamVideo.srcObject = null;
    webcamModal.classList.add("hidden");
    capturedBlob = null;
  }

  snapBtn.addEventListener("click", () => {
    const w = webcamVideo.videoWidth || 640;
    const h = webcamVideo.videoHeight || 480;
    webcamCanvas.width = w;
    webcamCanvas.height = h;
    webcamCanvas.getContext("2d").drawImage(webcamVideo, 0, 0, w, h);
    webcamCanvas.toBlob(
      (blob) => {
        capturedBlob = blob;
        webcamVideo.style.display = "none";
        webcamCanvas.style.display = "block";
        snapBtn.classList.add("hidden");
        retakeBtn.classList.remove("hidden");
        usePhotoBtn.classList.remove("hidden");
      },
      "image/jpeg",
      0.92,
    );
  });

  retakeBtn.addEventListener("click", () => {
    capturedBlob = null;
    webcamCanvas.style.display = "none";
    webcamVideo.style.display = "block";
    snapBtn.classList.remove("hidden");
    retakeBtn.classList.add("hidden");
    usePhotoBtn.classList.add("hidden");
  });

  usePhotoBtn.addEventListener("click", () => {
    if (!capturedBlob || !activeTargetInput) return;
    const fileName = `webcam-${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: "image/jpeg" });
    copyToNamedInput(file, activeTargetInput);
    const url = URL.createObjectURL(capturedBlob);
    activePreviewImg.src = url;
    activePreviewImg.style.display = "";
    activeLabelEl.textContent = fileName;
    activePreviewWrap.classList.remove("hidden");
    stopWebcam();
  });

  closeWebcamBtn.addEventListener("click", stopWebcam);
  webcamModal.addEventListener("click", (e) => {
    if (e.target === webcamModal) stopWebcam();
  });

  // ── Camera buttons ──
  mainCameraBtn.addEventListener("click", () => {
    isMobile
      ? mainCameraInput.click()
      : openWebcam(fileInput, attachPreviewWrap, attachPreview, fileLabel);
  });
  whCameraBtn.addEventListener("click", () => {
    isMobile
      ? whCameraInput.click()
      : openWebcam(whFileInput, whPreviewWrap, whPreview, whFileLabel);
  });

  mainCameraInput.addEventListener("change", function () {
    if (this.files[0]) {
      copyToNamedInput(this.files[0], fileInput);
      showPreview(this.files[0], attachPreviewWrap, attachPreview, fileLabel);
    }
  });
  whCameraInput.addEventListener("change", function () {
    if (this.files[0]) {
      copyToNamedInput(this.files[0], whFileInput);
      showPreview(this.files[0], whPreviewWrap, whPreview, whFileLabel);
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0])
      showPreview(
        fileInput.files[0],
        attachPreviewWrap,
        attachPreview,
        fileLabel,
      );
  });
  whFileInput.addEventListener("change", () => {
    if (whFileInput.files[0])
      showPreview(whFileInput.files[0], whPreviewWrap, whPreview, whFileLabel);
  });

  clearAttachBtn.addEventListener("click", () =>
    clearAttach(
      fileInput,
      mainCameraInput,
      attachPreviewWrap,
      attachPreview,
      fileLabel,
    ),
  );
  clearWhAttachBtn.addEventListener("click", () =>
    clearAttach(
      whFileInput,
      whCameraInput,
      whPreviewWrap,
      whPreview,
      whFileLabel,
    ),
  );

  // ────────────────────────────────────────────────
  // JOB TYPE → WAREHOUSE TOGGLE
  // ────────────────────────────────────────────────
  jobTypeSelect.addEventListener("change", () => {
    const isWH = jobTypeSelect.value === "Send to Warehouse";
    warehouseSection.classList.toggle("hidden", !isWH);
    additionalStepBadge.textContent = isWH ? "5" : "4";
    barcodeInput.focus();
  });

  warehouseIdSelect.addEventListener("change", () => {
    const opt = warehouseIdSelect.options[warehouseIdSelect.selectedIndex];
    warehouseNameHidden.value = opt ? opt.getAttribute("data-name") || "" : "";
  });

  // ────────────────────────────────────────────────
  // FETCH ITEM
  // ────────────────────────────────────────────────
  async function fetchItemDetails() {
    const barcode = barcodeInput.value.trim();
    clearMsgs();
    if (!barcode) return;
    itemDetailsExisting.classList.add("hidden");
    itemDetailsNew.classList.add("hidden");
    itemMissingInput.value = "false";
    itemId.value = division.value = section.value = department.value = "";
    category2Display.value = "";
    category3Display.value = "";
    category4Display.value = "";
    rspDisplay.value = "";
    category2Hidden.value = "";
    category3Hidden.value = "";
    category4Hidden.value = "";
    rspHidden.value = "";
    try {
      const res = await fetch(
        `/api/item?barcode=${encodeURIComponent(barcode)}`,
      );
      const data = await res.json();
      if (!data.success) {
        showError(data.message || "Failed to fetch item");
        return;
      }
      if (!data.found) {
        itemMissingInput.value = "true";
        itemDetailsNew.classList.remove("hidden");
        setTimeout(() => itemRemarksInput.focus(), 100);
      } else {
        const it = data.item;
        // Hidden fields for form submission
        itemId.value = it.item_id || "";
        division.value = it.division || "";
        section.value = it.section || "";
        department.value = it.department || "";
        category2Hidden.value = it.category2 || "";
        category3Hidden.value = it.category3 || "";
        category4Hidden.value = it.category4 || "";
        rspHidden.value = it.rsp || "";
        // Visible display fields
        category2Display.value = it.category2 || "";
        category3Display.value = it.category3 || "";
        category4Display.value = it.category4 || "";
        rspDisplay.value = it.rsp || "";
        itemDetailsExisting.classList.remove("hidden");
      }
    } catch (e) {
      showError("Error fetching item details");
    }
  }

  barcodeInput.addEventListener("blur", fetchItemDetails);
  barcodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchItemDetails();
    }
  });

  // ────────────────────────────────────────────────
  // DAMAGE REASON
  // ────────────────────────────────────────────────
  damageReasonSelect.addEventListener("change", () => {
    damageOtherWrap.classList.toggle(
      "hidden",
      damageReasonSelect.value !== "Others",
    );
    if (damageReasonSelect.value !== "Others")
      document.getElementById("damage_reason_other_remarks").value = "";
  });

  // ────────────────────────────────────────────────
  // FETCH CUSTOMER
  // ────────────────────────────────────────────────
  async function fetchCustomerDetails() {
    const num = customerNumberInput.value.trim();
    clearMsgs();
    if (!num) return;
    customerMissingInput.value = "false";
    customerFoundBadge.style.display = "none";
    customerNotFoundBadge.style.display = "none";
    customerRemarksWrapper.classList.add("hidden");
    customerNameInput.value =
      emailInput.value =
      pincodeInput.value =
      cityInput.value =
      stateInput.value =
      addressInput.value =
        "";
    whatsappOkSelect.value = "True";
    smsOkSelect.value = "True";
    customerRemarksInput.value = "";
    try {
      const res = await fetch(
        `/api/customer?customerNumber=${encodeURIComponent(num)}`,
      );
      const data = await res.json();
      if (!data.success) {
        showError(data.message || "Failed to fetch customer");
        return;
      }
      if (!data.found) {
        customerMissingInput.value = "true";
        customerNotFoundBadge.style.display = "inline-block";
        customerRemarksWrapper.classList.remove("hidden");
        setTimeout(() => customerRemarksInput.focus(), 100);
      } else {
        const c = data.customer;
        customerFoundBadge.style.display = "inline-block";
        customerNameInput.value = c.name || "";
        emailInput.value = c.email || "";
        pincodeInput.value = c.pincode || "";
        cityInput.value = c.city || "";
        stateInput.value = c.state || "";
        addressInput.value = c.address || "";
        whatsappOkSelect.value = c.whatsapp_ok || "False";
        smsOkSelect.value = c.sms_ok || "False";
        customerRemarksInput.value = c.remarks || "";
      }
    } catch (e) {
      showError("Error fetching customer");
    }
  }

  customerNumberInput.addEventListener("blur", fetchCustomerDetails);
  customerNumberInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchCustomerDetails();
    }
  });

  // ────────────────────────────────────────────────
  // VALIDATION
  // ────────────────────────────────────────────────
  function validateForm() {
    let valid = true;
    if (itemMissingInput.value === "true" && !itemRemarksInput.value.trim()) {
      setFieldError(
        itemRemarksInput,
        "Remarks are required when item is not found.",
      );
      if (valid)
        itemRemarksInput.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      valid = false;
    }
    if (
      customerMissingInput.value === "true" &&
      !customerRemarksInput.value.trim()
    ) {
      setFieldError(
        customerRemarksInput,
        "Remarks are required when customer is not found.",
      );
      if (valid)
        customerRemarksInput.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      valid = false;
    }
    if (!customerNumberInput.value.trim()) {
      setFieldError(customerNumberInput, "Customer number is required.");
      if (valid)
        customerNumberInput.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      valid = false;
    }
    return valid;
  }

  // ────────────────────────────────────────────────
  // OTP MODAL LOGIC
  // ────────────────────────────────────────────────

  function openOtpModal() {
    otpModal.classList.remove("hidden");
    otpModalInput.value = "";
    otpModalInput.readOnly = false;
    otpVerifyStatus.textContent = "";
    otpVerifyStatus.className = "otp-verify-status";
    confirmCreateJobBtn.disabled = true;
    otpVerified = false;
    resendOtpBtn.disabled = false;
    otpPhoneDisplay.textContent = customerNumberInput.value.trim();
    setTimeout(() => otpModalInput.focus(), 200);
  }

  function closeOtpModal() {
    otpModal.classList.add("hidden");
    stopOtpTimer();
    otpModalInput.value = "";
    otpModalInput.readOnly = false;
    otpVerifyStatus.textContent = "";
    otpVerifyStatus.className = "otp-verify-status";
    confirmCreateJobBtn.disabled = true;
    otpVerified = false;
    pendingJobId = null;
  }

  function startOtpTimer() {
    otpSeconds = 300;
    updateTimerDisplay();
    otpTimerInterval = setInterval(() => {
      otpSeconds--;
      updateTimerDisplay();
      if (otpSeconds <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
        otpTimerEl.textContent = "00:00";
        otpTimerEl.style.color = "#e53e3e";
        if (!otpVerified) {
          otpVerifyStatus.textContent = "OTP expired. Please resend.";
          otpVerifyStatus.className = "otp-verify-status otp-status-error";
        }
      }
    }, 1000);
  }

  function stopOtpTimer() {
    if (otpTimerInterval) {
      clearInterval(otpTimerInterval);
      otpTimerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const m = Math.floor(otpSeconds / 60);
    const s = otpSeconds % 60;
    otpTimerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    otpTimerEl.style.color = otpSeconds <= 60 ? "#e53e3e" : "#667eea";
  }

  async function requestOtp() {
    const phone = customerNumberInput.value.trim();
    const customerName = customerNameInput.value.trim() || "Customer";

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, customer_name: customerName }),
      });
      const data = await res.json();
      if (data.success) {
        pendingJobId = data.jobId;
        preGeneratedJobIdInput.value = data.jobId;
        openOtpModal();
        startOtpTimer();
        return true;
      } else {
        showError(data.message || "Failed to send OTP");
        return false;
      }
    } catch (err) {
      showError("Error sending OTP. Please try again.");
      return false;
    }
  }

  // ── Auto-verify OTP on 6 digit input ──
  otpModalInput.addEventListener("input", async () => {
    otpModalInput.value = otpModalInput.value.replace(/\D/g, "");

    if (otpModalInput.value.length !== 6) {
      otpVerifyStatus.textContent = "";
      otpVerifyStatus.className = "otp-verify-status";
      confirmCreateJobBtn.disabled = true;
      otpVerified = false;
      return;
    }

    otpVerifyStatus.textContent = "Verifying…";
    otpVerifyStatus.className = "otp-verify-status otp-status-pending";

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customerNumberInput.value.trim(),
          otp: otpModalInput.value.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.valid) {
        otpVerified = true;
        verifiedOtpInput.value = otpModalInput.value.trim();
        if (data.jobId) {
          pendingJobId = data.jobId;
          preGeneratedJobIdInput.value = data.jobId;
        }
        otpVerifyStatus.textContent = "✓ OTP is correct";
        otpVerifyStatus.className = "otp-verify-status otp-status-success";
        confirmCreateJobBtn.disabled = false;
        otpModalInput.readOnly = true;
      } else {
        otpVerified = false;
        confirmCreateJobBtn.disabled = true;
        otpVerifyStatus.textContent = data.message || "Invalid OTP";
        otpVerifyStatus.className = "otp-verify-status otp-status-error";
      }
    } catch (err) {
      otpVerifyStatus.textContent = "Verification failed. Try again.";
      otpVerifyStatus.className = "otp-verify-status otp-status-error";
    }
  });

  // ── Resend OTP ──
  resendOtpBtn.addEventListener("click", async () => {
    resendOtpBtn.disabled = true;
    otpModalInput.value = "";
    otpModalInput.readOnly = false;
    otpVerifyStatus.textContent = "Sending OTP…";
    otpVerifyStatus.className = "otp-verify-status otp-status-pending";
    confirmCreateJobBtn.disabled = true;
    otpVerified = false;
    stopOtpTimer();

    const phone = customerNumberInput.value.trim();
    const customerName = customerNameInput.value.trim() || "Customer";

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, customer_name: customerName }),
      });
      const data = await res.json();
      if (data.success) {
        pendingJobId = data.jobId;
        preGeneratedJobIdInput.value = data.jobId;
        startOtpTimer();
        otpVerifyStatus.textContent = "";
        otpVerifyStatus.className = "otp-verify-status";
        showToast("OTP resent successfully");
        setTimeout(() => otpModalInput.focus(), 100);
      } else {
        otpVerifyStatus.textContent = data.message || "Failed to resend OTP";
        otpVerifyStatus.className = "otp-verify-status otp-status-error";
      }
    } catch (err) {
      otpVerifyStatus.textContent = "Error resending OTP";
      otpVerifyStatus.className = "otp-verify-status otp-status-error";
    } finally {
      resendOtpBtn.disabled = false;
    }
  });

  // ── Close OTP modal ──
  closeOtpModalBtn.addEventListener("click", closeOtpModal);
  otpModal.addEventListener("click", (e) => {
    if (e.target === otpModal) closeOtpModal();
  });

  // ── Confirm Create Job from OTP modal ──
  confirmCreateJobBtn.addEventListener("click", async () => {
    if (!otpVerified) return;

    closeOtpModal();

    const allSubmit = [
      document.getElementById("submitJobBtn"),
      document.getElementById("submitJobBtn2"),
    ].filter(Boolean);

    pageLoader.classList.remove("hidden");
    allSubmit.forEach((b) => {
      b.disabled = true;
      b.textContent = "Creating…";
    });

    const formData = new FormData(jobForm);
    const selected =
      damageReasonSelect.options[damageReasonSelect.selectedIndex];
    formData.set(
      "damage_reason_display",
      selected
        ? selected.getAttribute("data-display") || selected.textContent
        : "",
    );

    try {
      const res = await fetch("/api/job", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        showSuccess(
          data.jobId
            ? `✓ Job Created! ID: ${data.jobId}`
            : "✓ Job created successfully",
        );
        showToast(
          data.jobId
            ? `Job created successfully — Job ID: ${data.jobId}`
            : "Job created successfully",
        );
        doReset();
      } else {
        showError(data.message || "Failed to create job");
      }
    } catch (err) {
      showError("Error submitting. Please try again.");
    } finally {
      pageLoader.classList.add("hidden");
      allSubmit.forEach((b) => {
        b.disabled = false;
        b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg> Create Job`;
      });
    }
  });

  // ────────────────────────────────────────────────
  // RESET
  // ────────────────────────────────────────────────
  function doReset() {
    jobForm.reset();
    clearMsgs();
    clearAttach(
      fileInput,
      mainCameraInput,
      attachPreviewWrap,
      attachPreview,
      fileLabel,
    );
    clearAttach(
      whFileInput,
      whCameraInput,
      whPreviewWrap,
      whPreview,
      whFileLabel,
    );
    jobTypeSelect.value = "Store Repair";
    warehouseSection.classList.add("hidden");
    additionalStepBadge.textContent = "4";
    [
      itemDetailsExisting,
      itemDetailsNew,
      damageOtherWrap,
      customerRemarksWrapper,
    ].forEach((el) => el.classList.add("hidden"));
    customerFoundBadge.style.display = "none";
    customerNotFoundBadge.style.display = "none";
    itemMissingInput.value = "false";
    customerMissingInput.value = "false";
    verifiedOtpInput.value = "";
    preGeneratedJobIdInput.value = "";
    pendingJobId = null;
    otpVerified = false;
    document.querySelectorAll(".field-err").forEach((el) => el.remove());
    [itemRemarksInput, customerRemarksInput].forEach((el) => {
      el.style.borderColor = "";
      el.style.boxShadow = "";
    });
    category2Display.value = "";
    category3Display.value = "";
    category4Display.value = "";
    rspDisplay.value = "";
    category2Hidden.value = "";
    category3Hidden.value = "";
    category4Hidden.value = "";
    rspHidden.value = "";
    setTimeout(() => barcodeInput.focus(), 100);
  }

  document.getElementById("resetJobBtn").addEventListener("click", doReset);
  document.getElementById("resetJobBtn2").addEventListener("click", doReset);

  // ────────────────────────────────────────────────
  // SUBMIT → triggers OTP flow
  // ────────────────────────────────────────────────
  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsgs();
    if (!validateForm()) return;

    const allSubmit = [
      document.getElementById("submitJobBtn"),
      document.getElementById("submitJobBtn2"),
    ].filter(Boolean);

    allSubmit.forEach((b) => {
      b.disabled = true;
      b.textContent = "Sending OTP…";
    });

    const success = await requestOtp();

    allSubmit.forEach((b) => {
      b.disabled = false;
      b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg> Create Job`;
    });

    if (!success) {
      showError("Failed to send OTP. Please try again.");
    }
  });
});
