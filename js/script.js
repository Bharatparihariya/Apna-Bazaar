let currentChatKey = "";
let currentBuyer =
  JSON.parse(localStorage.getItem("loggedInUser"))?.username || "";
let currentSeller = "";
$(document).ready(function () {
  // Load header and footer
  $("#header").load("header.html", function () {
    renderHeader();

    $(document).on("click", ".buyerItem", function () {
      const buyerName = $(this).data("name");
      $("#chatBuyerName").text(buyerName);
      $("#activeBuyerName").text(buyerName);

      if (window.matchMedia("(max-width: 767px)").matches) {
        $("#buyerListView").addClass("d-none");
        $("#backToBuyers").removeClass("d-none");
        $("#chatView").removeClass("d-none");
      }
      $("#miniChatInputBox").show();
    });

    $(document).on("click", "#backToBuyers", function () {
      $("#chatView").addClass("d-none");
      $("#buyerListView").removeClass("d-none");
      $("#miniChatInputBox").hide();
    });

    $(document).on("click", ".openChatBtn", function () {
      const chatKey = $(this).data("key");
      const productId = chatKey.split("-")[2]; // get product ID from key

      window.currentChatKey = chatKey;
      window.currentProductId = productId;

      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      window.currentBuyer = loggedInUser.username; // assuming buyer or sender is the current user

      $("#chatModal").modal("show");
      loadChat(chatKey);
    });
  });
  let allFaqs = [];

  // Load all FAQs from JSON
  $.getJSON("faq.json", function (data) {
    allFaqs = data;
    displayFaqs(allFaqs.slice(0, 5)); // Show only first 5
  });

  // Search handler
  $("#faqSearch").on("input", function () {
    const search = $(this).val().toLowerCase();

    if (search === "") {
      displayFaqs(allFaqs.slice(0, 5)); // Reset to first 5 if search cleared
    } else {
      const filtered = allFaqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(search) ||
          faq.answer.toLowerCase().includes(search)
      );
      displayFaqs(filtered);
    }
  });

  // Function to render FAQs
  function displayFaqs(faqs) {
    let html = "";
    faqs.forEach((faq, index) => {
      html += `
          <div class="accordion-item">
            <h2 class="accordion-header" id="heading${index}">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                ${faq.question}
              </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}">
              <div class="accordion-body text-white">${faq.answer}</div>
            </div>
          </div>
        `;
    });
    $("#faqList").html(html);
  }

  // Step 1: Get products from localStorage
  const allProducts = JSON.parse(localStorage.getItem("products")) || [];

  // Step 2: Shuffle the array
  const shuffledProducts = allProducts.sort(() => 0.5 - Math.random());

  // Step 3: Get the first 3 shuffled products
  const selectedProducts = shuffledProducts.slice(0, 3);

  // Step 4: Get sold product IDs
  const ordersProduct = JSON.parse(localStorage.getItem("orders")) || [];
  const soldProductIds = ordersProduct
    .filter((o) => o.status === "Sold")
    .map((o) => o.productId);

  // Step 5: Remove sold products from the selection
  const availableProducts = selectedProducts.filter(
    (p) => !soldProductIds.includes(p.id)
  );

  // Step 4: Render to #featured div
  const featuredDiv = $("#featured");
  availableProducts.forEach((product) => {
    const card = `
        <div class="col-md-4">
          <div class="card h-100 shadow-sm">
            <img src="${product.image}" class="card-img-top" alt="${product.name}">
            <div class="card-body">
              <h5 class="card-title">${product.name}</h5>
              <p class="card-text">${product.desc}</p>
              <p class="fw-bold">₹${product.price}</p>
              <a href="productDetail.html?id=${product.id}" class="btn btn-outline-purple mt-auto w-100">
              <i class="bi bi-eye-fill me-1"></i> View Details
            </a>
            </div>
          </div>
        </div>`;
    featuredDiv.append(card);
  });

  $(document).on("click", ".chatBtn", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      showAlert(
        "Please log in to start a chat.",
        "Warning",
        '<i class="bi bi-exclamation-triangle-fill text-warning"></i>'
      );
      return;
    }

    const productId = $(this).data("id");
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const selectedProduct = products.find((p) => p.id == productId);

    if (!selectedProduct) {
      showAlert(
        "Product not found",
        "Error",
        '<i class="bi bi-x-circle-fill text-danger"></i>'
      );
      return;
    }

    const currentBuyer = JSON.parse(
      localStorage.getItem("loggedInUser")
    )?.username;
    const currentSeller = selectedProduct.sellerId;

    if (currentBuyer === currentSeller) {
      showAlert(
        "You cannot chat about your own product.",
        "Info",
        '<i class="bi bi-info-circle-fill text-info"></i>'
      );
      return;
    }

    if (!currentBuyer || !currentSeller) {
      showAlert(
        "Invalid user or seller",
        "Error",
        '<i class="bi bi-x-circle-fill text-danger"></i>'
      );
      return;
    }

    // Save globally
    window.currentBuyer = currentBuyer;
    window.currentSeller = currentSeller;
    window.currentProductId = productId;
    window.currentChatKey = `${currentBuyer}-${currentSeller}-${productId}`;

    loadChat(window.currentChatKey, currentBuyer); // ✅ Load chat
    $("#chatModal").modal("show");
  });

  $(document).on("click", "#sendChatBtn", function () {
    const msg = $("#chatInput").val().trim();
    if (!msg || !window.currentChatKey) return;

    const allChats = JSON.parse(localStorage.getItem("chats")) || {};
    const newMsg = {
      sender: window.currentBuyer,
      message: msg,
      time: new Date().toISOString(),
      productId: window.currentProductId,
    };

    if (!allChats[window.currentChatKey]) allChats[window.currentChatKey] = [];
    allChats[window.currentChatKey].push(newMsg);
    localStorage.setItem("chats", JSON.stringify(allChats));

    $("#chatInput").val("");
    loadChat(window.currentChatKey, window.currentBuyer);
  });

  $(document).on("click", ".viewChatsBtn", function () {
    const productId = $(this).data("id");
    const seller = JSON.parse(localStorage.getItem("loggedInUser"))?.username;
    const allChats = JSON.parse(localStorage.getItem("chats")) || {};

    const buyers = Object.keys(allChats)
      .filter((key) => key.endsWith(`-${seller}-${productId}`))
      .map((key) => ({
        buyer: key.split("-")[0],
        key,
      }));

    if (buyers.length === 0) {
      $("#miniChatBody").html(
        `<p class="text-muted">No chats for this product yet.</p>`
      );
      $("#miniChatInputBox").addClass("d-none");
    } else {
      const html = buyers
        .map(
          (b) => `
      <button class="btn btn-light w-100 text-start buyerItem mb-2 openMiniChat"
        data-chatkey="${b.key}" data-buyer="${b.buyer}">
        <strong>${b.buyer}</strong>
      </button>`
        )
        .join("");

      $("#buyerList").html(html);

      // ✅ Auto-select first buyer ONLY on large screen (≥768px)
      if (window.innerWidth >= 768) {
        setTimeout(() => {
          $(".openMiniChat").first().trigger("click");
        }, 0);
      }

      $("#miniChatInputBox").addClass("d-none"); // Hide input until a chat is opened
    }

    // Finally show modal
    $("#chatMiniModal").modal("show");
  });

  $(document).on("click", ".openMiniChat", function () {
    const chatKey = $(this).data("chatkey");
    const buyer = $(this).data("buyer");
    $("#activeBuyerName").text(`${buyer}`);

    window.currentChatKey = chatKey;
    window.currentBuyer = buyer;

    const allChats = JSON.parse(localStorage.getItem("chats")) || {};
    const messages = allChats[chatKey] || [];

    const chatHtml = messages
      .map((m) => {
        const isMe = m.sender === buyer;
        const msgTime = new Date(m.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
    <div class="d-flex ${
      isMe ? "justify-content-start" : "justify-content-end"
    } mb-2">
      <div class="px-3 py-2 rounded-3 ${
        isMe ? "bg-white border" : "bg-purple text-white"
      }" style="max-width: 75%;">
        <div><small>${m.message}</small></div>
        <div class="text-end"><small>${msgTime}</small></div>
      </div>
    </div>
  `;
      })
      .join("");

    $("#miniChatBody").html(chatHtml);
    const chatBox = document.getElementById("miniChatBody");
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    $("#miniChatInputBox").removeClass("d-none");
  });

  $(document).on("click", "#sendMiniChatBtn", function () {
    const msg = $("#miniChatInput").val().trim();
    if (!msg || !window.currentChatKey) return;

    const sender = JSON.parse(localStorage.getItem("loggedInUser"))?.username;
    const allChats = JSON.parse(localStorage.getItem("chats")) || {};

    const newMsg = {
      sender,
      message: msg,
      time: new Date().toISOString(),
      productId: window.currentProductId,
    };

    if (!allChats[window.currentChatKey]) {
      allChats[window.currentChatKey] = [];
    }

    allChats[window.currentChatKey].push(newMsg);
    localStorage.setItem("chats", JSON.stringify(allChats));

    $("#miniChatInput").val("");

    loadChat(window.currentChatKey, sender, "miniChatBody");

    const chatBox = document.getElementById("miniChatBody");
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });

  $(document).on("keydown", "#miniChatInput", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("#sendMiniChatBtn").trigger("click");
    }
  });

  $("#addProductBtn").click(function () {
    $("#productForm")[0].reset();
    $("#productModal").modal("show");
  });

  // Load modals first and then register login/signup handlers
  $("#modals").load("modals.html", function () {
    // Signup
    $("#signupForm").submit(function (e) {
      e.preventDefault();

      const username = $("#signupUsername").val().trim();
      const password = $("#signupPassword").val();
      const role = $("#signupRole").val();

      // Remove old errors
      $("#signupForm .text-danger").remove();
      $("#signupForm .is-invalid").removeClass("is-invalid");

      let isValid = true;

      // Username validation
      if (!username) {
        $(
          "<span class='text-danger small'>Username is required.</span>"
        ).insertAfter("#signupUsername");
        $("#signupUsername").addClass("is-invalid");
        isValid = false;
      }

      // Password strength regex
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

      if (!password) {
        $(
          "<span class='text-danger small'>Password is required.</span>"
        ).insertAfter("#signupPassword");
        $("#signupPassword").addClass("is-invalid");
        isValid = false;
      } else if (!passwordRegex.test(password)) {
        $(
          "<span class='text-danger small'>Password must be at least 6 characters, include uppercase, lowercase, number, and symbol.</span>"
        ).insertAfter("#signupPassword");
        $("#signupPassword").addClass("is-invalid");
        isValid = false;
      }

      // Role validation
      if (!role) {
        $(
          "<span class='text-danger small'>Please select a role.</span>"
        ).insertAfter("#signupRole");
        $("#signupRole").addClass("is-invalid");
        isValid = false;
      }

      if (!isValid) return;

      // LocalStorage duplicate check
      let users = JSON.parse(localStorage.getItem("users")) || [];

      if (users.some((u) => u.username === username)) {
        showAlert(
          "Username already exists",
          "Warning",
          '<i class="bi bi-exclamation-circle-fill text-warning"></i>'
        );
        return;
      }

      // Save new user
      users.push({ username, password, role });
      localStorage.setItem("users", JSON.stringify(users));

      showAlert(
        "Signup successful!",
        "Success",
        '<i class="bi bi-check-circle-fill text-success"></i>'
      );

      $("#signupForm")[0].reset();

      const signupModalEl = document.getElementById("signupModal");
      if (signupModalEl) {
        const signupModal = bootstrap.Modal.getInstance(signupModalEl);
        if (signupModal) signupModal.hide();
      }
    });

    // Login
    $("#loginForm").submit(function (e) {
      e.preventDefault();
      const username = $("#loginUsername").val().trim();
      const password = $("#loginPassword").val();

      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find(
        (u) => u.username === username && u.password === password
      );

      if (user) {
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        showAlert(
          "Login successful!",
          "Success",
          '<i class="bi bi-check-circle-fill text-success"></i>'
        );
        $("#loginForm")[0].reset();

        // ✅ SAFELY hide modal
        const loginModalEl = document.getElementById("loginModal");
        if (loginModalEl) {
          const loginModal = bootstrap.Modal.getInstance(loginModalEl);
          if (loginModal) loginModal.hide();
        }

        renderHeader();
        setTimeout(function () {
          window.location.href = "index.html";
        }, 1000); // 2000 milliseconds = 2 seconds
      } else {
        const loginModalEl = document.getElementById("loginModal");
        if (loginModalEl) {
          const loginModal = bootstrap.Modal.getInstance(loginModalEl);
          if (loginModal) loginModal.hide();
          $("#loginForm")[0].reset();
        }
        showAlert(
          "Invalid username or password. Please try again.",
          "Login Failed",
          '<i class="bi bi-x-circle-fill text-danger"></i>'
        );
      }
    });
  });

  $("#footer").load("footer.html");

  // Logout
  $(document).on("click", "#logoutBtn,#logoutBtnMobile", function () {
    localStorage.removeItem("loggedInUser");
    renderHeader();
    window.location.href = "index.html";
  });

  // -------------------- Product Section --------------------

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  let products = JSON.parse(localStorage.getItem("products")) || [];

  if (loggedInUser?.role === "seller") {
    $("#addProductBtn").removeClass("d-none");
  }

  // // Submit Product
  // $("#productForm").submit(function (e) {
  //   e.preventDefault();
  //   const id = $("#prodId").val() || Date.now();
  //   const product = {
  //     id,
  //     name: $("#prodName").val(),
  //     price: +$("#prodPrice").val(),
  //     desc: $("#prodDesc").val(),
  //     city: $("#prodCity").val(),
  //     state: $("#prodState").val(),
  //     category: $("#prodCategory").val(),
  //     sellerId: loggedInUser.username,
  //   };

  //   const file = $("#prodImage")[0].files[0];
  //   const saveAndClose = (img) => {
  //     product.image = img || products.find((p) => p.id == id)?.image || "";

  //     if ($("#prodId").val()) {
  //       products = products.map((p) => (p.id == id ? product : p));
  //     } else {
  //       products.push(product);
  //     }

  //     localStorage.setItem("products", JSON.stringify(products));
  //     $("#productForm")[0].reset();
  //     const modal = bootstrap.Modal.getInstance(
  //       document.getElementById("productModal")
  //     );
  //     if (modal) modal.hide();
  //     showAlert(
  //       "Product added successfully!",
  //       "Success",
  //       '<i class="bi bi-check-circle-fill text-success fs-5"></i>'
  //     );

  //     renderSellerProducts(loggedInUser.username);
  //   };

  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = (e) => saveAndClose(e.target.result);
  //     reader.readAsDataURL(file);
  //   } else {
  //     saveAndClose();
  //   }
  // });

  $("#productForm").submit(function (e) {
    e.preventDefault();

    // Clear previous errors
    $("#productForm .text-danger").remove();

    // Form field values
    const id = $("#prodId").val() || Date.now();
    const name = $("#prodName").val().trim();
    const price = $("#prodPrice").val().trim();
    const desc = $("#prodDesc").val().trim();
    const city = $("#prodCity").val().trim();
    const state = $("#prodState").val().trim();
    const category = $("#prodCategory").val();
    const file = $("#prodImage")[0].files[0];

    let isValid = true;

    // Validation function
    const showError = (selector, message) => {
      isValid = false;
      const $field = $(selector).closest(".mb-3");
      $field.find(".text-danger").remove(); // prevent duplicates
      $field.append(`<div class="text-danger small mt-1">${message}</div>`);
    };

    // Validation rules
    if (!name) showError("#prodName", "Product name is required.");
    if (!price || isNaN(price) || +price <= 0)
      showError("#prodPrice", "Valid price is required.");
    if (!desc) showError("#prodDesc", "Description is required.");
    if (!city) showError("#prodCity", "City is required.");
    if (!state) showError("#prodState", "State is required.");
    if (!category) showError("#prodCategory", "Please select a category.");
    if (!file && !$("#prodId").val())
      showError("#prodImage", "Product image is required.");

    if (!isValid) return;

    // Continue only if valid
    const product = {
      id,
      name,
      price: +price,
      desc,
      city,
      state,
      category,
      sellerId: loggedInUser.username,
    };

    const saveAndClose = (img) => {
      product.image = img || products.find((p) => p.id == id)?.image || "";

      if ($("#prodId").val()) {
        products = products.map((p) => (p.id == id ? product : p));
      } else {
        products.push(product);
      }

      localStorage.setItem("products", JSON.stringify(products));
      $("#productForm")[0].reset();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("productModal")
      );
      if (modal) modal.hide();

      showAlert(
        "Product added successfully!",
        "Success",
        '<i class="bi bi-check-circle-fill text-success fs-5"></i>'
      );

      renderSellerProducts(loggedInUser.username);
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => saveAndClose(e.target.result);
      reader.readAsDataURL(file);
    } else {
      saveAndClose();
    }
  });

  // Edit Product
  $(document).on("click", ".editBtn", function () {
    const prod = products.find((p) => p.id == $(this).data("id"));
    $("#prodId").val(prod.id);
    $("#prodName").val(prod.name);
    $("#prodPrice").val(prod.price);
    $("#prodDesc").val(prod.desc);
    $("#prodCity").val(prod.city);
    $("#prodState").val(prod.state);
    $("#prodCategory").val(prod.category);
    new bootstrap.Modal(document.getElementById("productModal")).show();
  });

  // Delete Product
  // $(document).on("click", ".deleteBtn", function () {
  //   if (confirm("Delete this product?")) {
  //     products = products.filter((p) => p.id != $(this).data("id"));
  //     localStorage.setItem("products", JSON.stringify(products));
  //     renderSellerProducts(loggedInUser.username);
  //   }
  // });

  let productToDeleteId = null;

  $(document).on("click", ".deleteBtn", function () {
    productToDeleteId = $(this).data("id");
    $("#confirmDeleteModal").modal("show");
  });

  $("#confirmDeleteYes").click(function () {
    products = products.filter((p) => p.id != productToDeleteId);
    localStorage.setItem("products", JSON.stringify(products));
    renderSellerProducts(loggedInUser.username);
    $("#confirmDeleteModal").modal("hide");
  });

  // Filter Controls
  $("#filterCategory, #filterPrice, #filterCity, #filterState, #filterName").on(
    "input change",
    renderProducts
  );

  $("#clearFilters").click(() => {
    $(
      "#filterCategory, #filterPrice, #filterCity, #filterState, #filterName"
    ).val("");
    renderProducts();
  });

  function renderProducts() {
    // 1) SHOW the spinner
    $("#productLoader").show();
    $("#productDisplayArea").empty();

    // 2) Defer the heavy work so the browser can paint
    setTimeout(() => {
      // ——— Your existing filter logic ———
      const name = $("#filterName").val()?.toLowerCase();
      const city = $("#filterCity").val()?.toLowerCase();
      const state = $("#filterState").val()?.toLowerCase();
      const category = $("#filterCategory").val();
      const price = +$("#filterPrice").val();

      const orders = JSON.parse(localStorage.getItem("orders")) || [];
      const soldProductIds = orders
        .filter((o) => o.status === "Sold")
        .map((o) => o.productId);
      let filtered = products.filter(
        (p) =>
          (!name || p.name.toLowerCase().includes(name)) &&
          (!city || p.city.toLowerCase().includes(city)) &&
          (!state || p.state.toLowerCase().includes(state)) &&
          (!category || p.category === category) &&
          (!price || p.price <= price) &&
          !soldProductIds.includes(p.id) // ✅ EXCLUDE sold products
      );

      // ——— Build your cards HTML ———
      const cardsHtml = filtered
        .map(
          (p) => `
      <div class="col-sm-6 col-md-4">
        <div class="card h-100 shadow-sm rounded-4 border-0">
          <img src="${p.image}" class="card-img-top" alt="${p.name}">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.name}</h5>
            <p class="card-text mb-1"><strong>₹${p.price}</strong> – ${p.category}</p>
            <p class="text-muted small mb-1">${p.city}, ${p.state}</p>
            <p class="text-muted small mb-2">${p.desc}</p>
            <p class="text-muted small mb-2">
              <i class="bi bi-person-fill"></i> Seller: <strong>${p.sellerId}</strong>
            </p>
            <a href="productDetail.html?id=${p.id}"
               class="btn btn-outline-purple mt-auto w-100">
              <i class="bi bi-eye-fill me-1"></i> View Details
            </a>
          </div>
        </div>
      </div>
    `
        )
        .join("");

      // 3) Inject the HTML (or a “no products” message)
      $("#productDisplayArea").html(
        cardsHtml || "<p class='text-center'>No products found.</p>"
      );

      // 4) HIDE the spinner
      $("#productLoader").addClass("d-none");
    }, 0);
  }

  renderProducts();

  // On the "My Products" page
  if ($("#myProductList").length) {
    if (!loggedInUser || loggedInUser.role !== "seller") {
      $("#myProductList").html(`
      <div class="alert alert-danger">Access Denied. Only sellers can view this page.</div>
    `);
      $("#addProductBtn").hide();
    } else {
      $("#addProductBtn").removeClass("d-none");
      renderSellerProducts(loggedInUser.username);
    }
  }

  ///Product Details

  function renderSellerProducts(username) {
    const allProducts = JSON.parse(localStorage.getItem("products")) || [];
    const allChats = JSON.parse(localStorage.getItem("chats")) || {};
    const sellerProducts = allProducts.filter((p) => p.sellerId === username);

    const html = sellerProducts
      .map((p) => {
        // Check if this product has at least one chat
        const hasChat = Object.keys(allChats).some((key) => key.includes(p.id));

        return `
      <div class="card mb-3 shadow-sm border-0">
        <div class="row g-0 align-items-center">

          <!-- Product Image -->
          <div class="col-4 col-sm-3">
            <img src="${p.image}" alt="${
          p.name
        }" class="img-fluid rounded w-100 object-fit-contain" style="max-height: 120px;">
          </div>

          <!-- Product Info -->
          <div class="col-6 col-sm-7">
            <div class="card-body py-2">
              <h6 class="card-title mb-1 text-primary">${p.name}</h6>
              <p class="card-text mb-1"><strong>₹${p.price}</strong> • ${
          p.category
        }</p>
              <p class="text-muted small mb-1">${p.city}, ${p.state}</p>
              <p class="text-muted small mb-0">${p.desc}</p>
            </div>
          </div>

          <!-- Vertical Buttons -->
          <div class="col-2 d-flex flex-column align-items-end justify-content-center gap-2 pe-3">

            <!-- Edit Button -->
            <button class="btn btn-sm btn-outline-warning editBtn" data-id="${
              p.id
            }">
              <i class="bi bi-pencil-square"></i>
              <span class="d-none d-sm-inline"> Edit</span>
            </button>

            <!-- Delete Button -->
            <button class="btn btn-sm btn-outline-danger deleteBtn" data-id="${
              p.id
            }">
              <i class="bi bi-trash"></i>
              <span class="d-none d-sm-inline"> Delete</span>
            </button>

            <!-- View Chats Button (conditionally rendered) -->
            ${
              hasChat
                ? `
            <button class="btn btn-sm btn-outline-primary viewChatsBtn" data-id="${p.id}">
              <i class="bi bi-chat-dots"></i>
              <span class="d-none d-sm-inline"> View Chats</span>
            </button>`
                : ""
            }

          </div>

        </div>
      </div>
    `;
      })
      .join("");

    $("#myProductList").html(
      html || `<p class="text-muted">You haven't added any products yet.</p>`
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if ($("#productDetailArea").length && productId) {
    const allProducts = JSON.parse(localStorage.getItem("products")) || [];
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const product = allProducts.find((p) => p.id == productId);

    if (!product) {
      $("#productDetailArea").html(
        "<p class='text-danger'>Product not found.</p>"
      );
    } else {
      const currentOrder = orders.find((order) => order.productId == productId);
      let orderActionHTML = "";

      if (!currentOrder) {
        orderActionHTML = `
        <button class="btn btn-success placeOrderBtn" data-id="${product.id}">
          <i class="bi bi-bag-check-fill"></i> Place Order
        </button>`;
      } else if (currentOrder.status === "Pending") {
        orderActionHTML = `<span class="badge rounded-pill bg-warning text-dark d-inline-flex align-items-center gap-1 px-3 py-2 mt-2">
        <i class="bi bi-hourglass-split"></i> Order Pending</span>`;
      } else if (currentOrder.status === "Sold") {
        orderActionHTML = `<span class="badge rounded-pill bg-success d-inline-flex align-items-center gap-1 px-3 py-2 mt-2">
  <i class="bi bi-check2-circle"></i> Sold
</span>
`;
      }

      const html = `
  <div class="row g-4 align-items-start">
    <!-- Product Image -->
    <div class="col-12 col-md-6 text-center text-md-start">
      <img src="${product.image}" alt="${product.name}" 
        class="img-fluid shadow-sm rounded-4 w-100" 
        style="max-height: 300px; object-fit: contain;" />
    </div>

    <!-- Product Info -->
    <div class="col-12 col-md-6">
      <h3 class="fw-bold mb-2">${product.name}</h3>
      <p class="text-muted mb-1">${product.category}</p>
      <h4 class="text-success fw-semibold mb-3">₹${product.price}</h4>

      <div class="row mb-2">
        <div class="col-6 small"><strong>City:</strong> ${product.city}</div>
        <div class="col-6 small"><strong>State:</strong> ${product.state}</div>
      </div>

      <p class="mb-3"><strong>Description:</strong> ${product.desc}</p>

      <p class="mb-3">
        <i class="bi bi-person-fill me-1 text-secondary"></i>
        <strong>Seller:</strong> ${product.sellerId}
      </p>

    

      <!-- Action Buttons (Place Order / Mark Sold etc.) -->
      <div class="mt-3  d-flex flex-wrap gap-2">
        <!-- Chat Button -->
      <button class="btn bg-purple text-white chatBtn" data-id="${product.id}">
        <i class="bi bi-chat-dots-fill me-1"></i> Chat with Seller
      </button>
        ${orderActionHTML}
      </div>
    </div>
  </div>
`;

      $("#productDetailArea").html(html);
    }
  }

  // ✅ Handle Place Order Button
  $(document).on("click", ".placeOrderBtn", function () {
    const productId = $(this).data("id");
    const allProducts = JSON.parse(localStorage.getItem("products")) || [];
    const product = allProducts.find((p) => p.id == productId);
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    // if (!loggedInUser || loggedInUser.role !== "buyer") {
    //   showAlert(
    //     "Please login as a buyer to place an order.",
    //     "Warning",
    //     '<i class="bi bi-exclamation-triangle-fill text-warning"></i>'
    //   );
    //   return;
    // }

    // Prevent buyer from ordering their own product
    if (product.sellerId === loggedInUser.username) {
      showAlert(
        "You cannot order your own product.",
        "Warning",
        '<i class="bi bi-exclamation-triangle-fill text-warning"></i>'
      );
      return;
    }

    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const alreadyOrdered = orders.find(
      (o) => o.productId === product.id && o.buyerId === loggedInUser.username
    );

    if (alreadyOrdered) {
      showAlert(
        "You have already placed an order for this product.",
        "Warning",
        '<i class="bi bi-exclamation-triangle-fill text-warning"></i>'
      );
      return;
    }

    const newOrder = {
      id: Date.now(),
      productId: product.id,
      buyerId: loggedInUser.username,
      sellerId: product.sellerId,
      orderDate: new Date().toISOString(),
      quantity: 1,
      status: "Pending",
    };

    orders.push(newOrder);
    localStorage.setItem("orders", JSON.stringify(orders));

    showAlert(
      "Order placed successfully!",
      "Success",
      '<i class="bi bi-check-circle-fill text-success"></i>'
    );

    // ✅ Reload after 1.5 seconds
    setTimeout(() => {
      location.reload();
    }, 2000);
  });

  const orders = JSON.parse(localStorage.getItem("orders")) || [];
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const container = $("#ordersContainer");

  if (!loggedInUser) {
    container.html(
      "<div class='alert alert-warning'>Please log in to view orders.</div>"
    );
    return;
  }

  let myPurchases = [];
  let myReceivedOrders = [];

  if (loggedInUser.role === "buyer") {
    // Buyer role: Only show their purchases
    myPurchases = orders.filter(
      (order) => order.buyerId === loggedInUser.username
    );
  } else if (loggedInUser.role === "seller") {
    // Seller role: Split into purchases and received orders
    myPurchases = orders.filter(
      (order) => order.buyerId === loggedInUser.username
    );
    myReceivedOrders = orders.filter(
      (order) => order.sellerId === loggedInUser.username
    );
  }

  // Helper function to generate order cards
  function generateOrderCards(orderList, roleContext) {
    let html = "";

    orderList.forEach((order) => {
      const product = products.find((p) => p.id === order.productId);
      if (!product) return;

      const buyer = users.find((u) => u.username === order.buyerId);
      const seller = users.find((u) => u.username === order.sellerId);

      // Status Badge
      let statusClass = "secondary";
      let statusIcon = "";
      let statusText = order.status;

      if (order.status === "Pending") {
        statusClass = "warning text-dark";
        statusIcon = `<i class="bi bi-hourglass-split me-1"></i>`;
      } else if (order.status === "Confirmed") {
        statusClass = "primary";
        statusIcon = `<i class="bi bi-patch-check-fill me-1"></i>`;
      } else if (order.status === "Sold") {
        statusClass = "success";
        statusIcon =
          roleContext === "buyer"
            ? `<i class="bi bi-bag-check-fill me-1"></i>`
            : `<i class="bi bi-check2-circle me-1"></i>`;
        statusText = roleContext === "buyer" ? "Purchase Successful" : "Sold";
      }

      const statusHTML = `
      <span class="badge rounded-pill bg-${statusClass} d-inline-flex align-items-center gap-1 px-3 py-2 mt-2">
        ${statusIcon}${statusText}
      </span>`;

      const markSoldBtn =
        roleContext === "seller" && order.status === "Pending"
          ? `<button class="btn btn-sm btn-outline-success markSoldBtn" data-id="${order.id}">
            <i class="bi bi-check-circle me-1"></i>Confirm Order
          </button>`
          : "";

      const cancelOrderBtn =
        roleContext === "buyer" && order.status === "Pending"
          ? `<button class="btn btn-sm btn-outline-danger cancelOrderBtn" data-id="${order.id}">
        <i class="bi bi-x-circle me-1"></i>Cancel Order
      </button>`
          : "";

      html += `
      <div class="order-card border rounded-4 p-3 mb-4 shadow-sm bg-white">
        <div class="row g-3 align-items-center">
          <div class="col-12 col-md-4 text-center text-md-start">
            <img src="${product.image}" alt="${
        product.name
      }" class="img-fluid rounded-3 shadow-sm" style="max-height: 140px; object-fit: contain;" />
          </div>
          <div class="col-12 col-md-8">
            <div class="d-flex justify-content-between flex-wrap align-items-start">
              <div>
                <h5 class="mb-1 fw-bold">${product.name}</h5>
                <p class="text-muted small mb-2">${product.category}</p>
                <h6 class="text-success fw-semibold">₹${product.price}</h6>
              </div>
              <div class="text-end">
                <small class="text-muted fw-semibold d-block">Order ID:</small>
                <small class="text-muted">${order.id}</small>
              </div>
            </div>

            <div class="row mt-3 small">
              <div class="col-6 col-lg-4 mb-1"><strong>City:</strong> ${
                product.city
              }</div>
              <div class="col-6 col-lg-4 mb-1"><strong>State:</strong> ${
                product.state
              }</div>
              <div class="col-6 col-lg-4 mb-1"><strong>Ordered:</strong> ${new Date(
                order.orderDate
              ).toLocaleDateString()}</div>
              ${
                roleContext === "buyer"
                  ? `<div class="col-6 col-lg-4 mb-1"><strong>Seller:</strong> ${
                      seller?.username || "N/A"
                    }</div>`
                  : `<div class="col-6 col-lg-4 mb-1"><strong>Buyer:</strong> ${
                      buyer?.username || "N/A"
                    }</div>`
              }
              <div class="col-12 mb-2"><strong>Description:</strong> ${
                product.desc
              }</div>
            </div>

            <div class="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
              ${statusHTML}
              ${markSoldBtn}
              ${cancelOrderBtn}
            </div>
          </div>
        </div>
      </div>
    `;
    });

    return (
      html ||
      `<div class='alert alert-info'>No orders found in this section.</div>`
    );
  }

  // Render output
  let finalHTML = "";

  // For buyers or seller-purchases
  if (myPurchases.length > 0) {
    finalHTML += `<h4 class="mb-3 text-primary">🛒 My Purchases</h4>`;
    finalHTML += generateOrderCards(myPurchases, "buyer");
  }

  // For seller orders
  if (myReceivedOrders.length > 0) {
    finalHTML += `<h4 class="mb-3 text-success">📦 Orders Received</h4>`;
    finalHTML += generateOrderCards(myReceivedOrders, "seller");
  }

  if (!finalHTML) {
    finalHTML = `<div class='alert alert-info'>No orders found for your account.</div>`;
  }

  container.html(finalHTML);

  $(document).on("click", ".cancelOrderBtn", function () {
    const orderId = $(this).data("id");

    if (!confirm("Are you sure you want to cancel this order?")) return;

    let orders = JSON.parse(localStorage.getItem("orders")) || [];

    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex !== -1) {
      orders.splice(orderIndex, 1); // Remove the order
      localStorage.setItem("orders", JSON.stringify(orders));
      showAlert(
        "Order cancelled successfully!",
        "Success",
        '<i class="bi bi-check-circle-fill text-success"></i>'
      );
      loadOrders(); // Re-render orders list
    } else {
      showAlert(
        "Order not found.",
        "Error",
        '<i class="bi bi-x-circle-fill text-danger"></i>'
      );
    }
  });

  $(document).on("click", ".markSoldBtn", function () {
    const orderId = $(this).data("id");
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const index = orders.findIndex((order) => order.id == orderId);

    if (index !== -1) {
      orders[index].status = "Sold";
      localStorage.setItem("orders", JSON.stringify(orders));
      showAlert(
        "Order marked as Sold!",
        "Success",
        '<i class="bi bi-check-circle-fill text-success"></i>'
      );

      setTimeout(() => {
        location.reload();
      }, 2000);
    }
  });
});

function loadChat(chatKey, currentUser, targetBoxId = "chatBox") {
  const allChats = JSON.parse(localStorage.getItem("chats")) || {};
  const messages = allChats[chatKey] || [];

  const html = messages
    .map((msg) => {
      const isMe = msg.sender === currentUser;
      return `
        <div class="text-${isMe ? "end" : "start"} mb-2">
          <div class="d-inline-block px-3 py-2 rounded-3 ${
            isMe ? "bg-purple text-white" : "bg-light"
          }">
            <small>${msg.message}</small><br/>
            <small class=" d-block text-end" style="font-size: 0.7rem;">
              ${new Date(msg.time).toLocaleTimeString()}
            </small>
          </div>
        </div>
      `;
    })
    .join("");

  const $box = $(`#${targetBoxId}`);
  $box.html(html);

  const boxEl = $box[0];
  if (boxEl) boxEl.scrollTop = boxEl.scrollHeight;
}

// Render Header

function renderHeader() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const $header = $("#headerActions,#headerActionsMobile");

  // Show/hide "My Products" nav link
  if (loggedInUser?.role === "seller") {
    $("#myProductsLink,#myProductsLinkMobile").removeClass("d-none");
  } else {
    $("#myProductsLink,#myProductsLinkMobile").addClass("d-none");
  }
  if (!loggedInUser) {
    $("#nav-orders,#nav-orders-mobile").hide();
  } else {
    // Optionally, show only to buyers and sellers
    if (loggedInUser.role !== "buyer" && loggedInUser.role !== "seller") {
      $("#nav-orders,#nav-orders-mobile").hide();
    } else {
      $("#nav-orders,#nav-orders-mobile").show();
    }
  }

  if (loggedInUser) {
    $header.html(`
  <!-- 🌐 Large Screen (Desktop) -->
  <div class="dropdown text-white d-none d-lg-block">
    <div class="d-flex align-items-center gap-2 dropdown-toggle"
         role="button" id="userMenu" data-bs-toggle="dropdown" aria-expanded="false" style="cursor: pointer;">
      <div class="rounded-circle bg-white text-primary d-flex justify-content-center align-items-center"
           style="width: 36px; height: 36px;">
        <i class="bi bi-person-fill fs-5"></i>
      </div>
      <div class="d-flex flex-column lh-sm">
        <span class="fw-semibold">${loggedInUser.username}</span>
        <span class="small text-white-50 text-capitalize">${loggedInUser.role}</span>
      </div>
    </div>

    <ul class="dropdown-menu dropdown-menu-end mt-2 shadow" aria-labelledby="userMenu">
      <li>
        <a class="dropdown-item d-flex align-items-center gap-2" href="#" id="logoutBtnMobile">
          <i class="bi bi-box-arrow-right text-danger"></i> Logout
        </a>
      </li>
    </ul>
  </div>

  <!-- 📱 Mobile View -->
<div class="d-flex flex-column gap-2 px-3 py-3 rounded text-white w-100 d-lg-none"
     style="background: linear-gradient(to right, #5e17eb, #9333ea); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

  <!-- User Info -->
  <div class="d-flex align-items-center gap-3">
    <div class="rounded-circle bg-white text-primary d-flex justify-content-center align-items-center"
         style="width: 40px; height: 40px;">
      <i class="bi bi-person-fill fs-5"></i>
    </div>
    <div>
      <div class="fw-semibold text-break">${loggedInUser.username}</div>
      <div class="small text-white-50 text-capitalize">${loggedInUser.role}</div>
    </div>
  </div>

  <!-- Logout Button Below -->
  <div id="logoutBtnMobile"
       role="button"
       class="d-flex align-items-center justify-content-center gap-2 px-3 py-2 rounded-pill bg-white text-primary fw-medium"
       style="transition: 0.3s;">
    <i class="bi bi-box-arrow-right fs-5"></i>
    <span>Logout</span>
  </div>

</div>

`);
  } else {
    $header.html(`
     <div class="text-white nav-item-hover nav-item me-2" data-bs-toggle="modal" data-bs-target="#loginModal">
  <i class="bi bi-box-arrow-in-right"></i> Login
</div>
<div class="text-white nav-item-hover" data-bs-toggle="modal" data-bs-target="#signupModal">
  <i class="bi bi-person-plus"></i> Sign Up
</div>

    `);
  }
}

function showAlert(message, title = "Alert", iconHTML = "") {
  $("#customAlertMessage").text(message);
  $("#customAlertTitle").text(title);
  $("#customAlertIcon").html(iconHTML);
  $("#customAlertModal").modal("show");
}
