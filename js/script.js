let currentChatKey = "";
let currentBuyer =
  JSON.parse(localStorage.getItem("loggedInUser"))?.username || "";
let currentSeller = "";
$(document).ready(function () {
  // Load header and footer
  $("#header").load("header.html", function () {
    renderHeader();
  });

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (user && user.role === "seller") {
    // Change icon to a box/package icon
    $("#ordersIcon").removeClass().addClass("bi bi-box-seam fs-3 text-success");
    // Update heading
    $("#ordersTitle").text("Received Orders");
    // Update badge text
    $("#ordersBadge").text("📥 Orders from buyers");
  }

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

  // Step 4: Render to #featured div
  const featuredDiv = $("#featured");
  selectedProducts.forEach((product) => {
    const card = `
        <div class="col-md-4">
          <div class="card h-100 shadow-sm">
            <img src="${product.image}" class="card-img-top" alt="${product.name}">
            <div class="card-body">
              <h5 class="card-title">${product.name}</h5>
              <p class="card-text">${product.desc}</p>
              <p class="fw-bold">₹${product.price}</p>
              <a href="productDetail.html?id=${product.id}" class="btn btn-outline-purple btn-md">View Details</a>
            </div>
          </div>
        </div>`;
    featuredDiv.append(card);
  });

  $(document).on("click", ".chatBtn", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      return alert("⚠️ Please log in to start a chat.");
    }

    const productId = $(this).data("id");
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const selectedProduct = products.find((p) => p.id == productId);

    if (!selectedProduct) return alert("Product not found");

    const currentBuyer = JSON.parse(
      localStorage.getItem("loggedInUser")
    )?.username;
    const currentSeller = selectedProduct.sellerId;

    if (!currentBuyer || !currentSeller) return alert("Invalid user or seller");

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
        <button class="btn btn-outline-dark w-100 text-start mb-2 openMiniChat"
          data-chatkey="${b.key}" data-buyer="${b.buyer}">
          💬 <strong>${b.buyer}</strong>
        </button>
        `
        )
        .join("");
      $("#miniChatBody").html(html);
      $("#miniChatInputBox").addClass("d-none"); // Hide input until chat opens
    }

    $("#chatMiniModal").modal("show");
  });

  $(document).on("click", ".openMiniChat", function () {
    const chatKey = $(this).data("chatkey");
    const buyer = $(this).data("buyer");

    window.currentChatKey = chatKey;
    window.currentBuyer = buyer;

    const allChats = JSON.parse(localStorage.getItem("chats")) || {};
    const messages = allChats[chatKey] || [];

    const chatHtml = messages
      .map((m) => {
        const isMe = m.sender === buyer;
        return `
        <div class="text-${isMe ? "start" : "end"} mb-2">
          <div class="px-3 py-2 rounded-3 ${
            isMe ? "bg-light" : "bg-purple text-white"
          } d-inline-block">
            <small>${m.message}</small>
          </div>
        </div>
      `;
      })
      .join("");

    $("#miniChatBody").html(chatHtml);
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
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
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

      let users = JSON.parse(localStorage.getItem("users")) || [];

      if (users.some((u) => u.username === username)) {
        alert("Username already exists");
        return;
      }

      users.push({ username, password, role });
      localStorage.setItem("users", JSON.stringify(users));
      alert("Signup successful!");
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
        alert("Login successful!");
        $("#loginForm")[0].reset();

        // ✅ SAFELY hide modal
        const loginModalEl = document.getElementById("loginModal");
        if (loginModalEl) {
          const loginModal = bootstrap.Modal.getInstance(loginModalEl);
          if (loginModal) loginModal.hide();
        }

        renderHeader();
        window.location.href = "index.html";
      } else {
        alert("Invalid credentials");
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

  // Submit Product
  $("#productForm").submit(function (e) {
    e.preventDefault();
    const id = $("#prodId").val() || Date.now();
    const product = {
      id,
      name: $("#prodName").val(),
      price: +$("#prodPrice").val(),
      desc: $("#prodDesc").val(),
      city: $("#prodCity").val(),
      state: $("#prodState").val(),
      category: $("#prodCategory").val(),
      sellerId: loggedInUser.username,
    };

    const file = $("#prodImage")[0].files[0];
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
  $(document).on("click", ".deleteBtn", function () {
    if (confirm("Delete this product?")) {
      products = products.filter((p) => p.id != $(this).data("id"));
      localStorage.setItem("products", JSON.stringify(products));
      renderSellerProducts(loggedInUser.username);
    }
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

      let filtered = products.filter(
        (p) =>
          (!name || p.name.toLowerCase().includes(name)) &&
          (!city || p.city.toLowerCase().includes(city)) &&
          (!state || p.state.toLowerCase().includes(state)) &&
          (!category || p.category === category) &&
          (!price || p.price <= price)
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

  function renderSellerProducts(username) {
    const allProducts = JSON.parse(localStorage.getItem("products")) || [];
    const sellerProducts = allProducts.filter((p) => p.sellerId === username);

    const html = sellerProducts
      .map(
        (p) => `
     <div class="card mb-3 shadow-sm border-0">
  <div class="row g-0 align-items-center">

    <!-- Product Image -->
    <div class="col-4 col-sm-3">
      <img src="${p.image}" alt="${p.name}" class="img-fluid rounded w-100  object-fit-contain" style="max-height: 120px;">
    </div>

    <!-- Product Info -->
    <div class="col-6 col-sm-7">
      <div class="card-body py-2">
        <h6 class="card-title mb-1 text-primary">${p.name}</h6>
        <p class="card-text mb-1"><strong>₹${p.price}</strong> • ${p.category}</p>
        <p class="text-muted small mb-1">${p.city}, ${p.state}</p>
        <p class="text-muted small mb-0">${p.desc}</p>
      </div>
    </div>

    <!-- Vertical Buttons -->
<div class="col-2 d-flex flex-column align-items-end justify-content-center gap-2 pe-3">

  <!-- Edit Button -->
  <button class="btn btn-sm btn-outline-warning editBtn" data-id="${p.id}">
    <i class="bi bi-pencil-square"></i>
    <span class="d-none d-sm-inline"> Edit</span> <!-- show text only on sm and up -->
  </button>

  <!-- Delete Button -->
  <button class="btn btn-sm btn-outline-danger deleteBtn" data-id="${p.id}">
    <i class="bi bi-trash"></i>
    <span class="d-none d-sm-inline"> Delete</span> <!-- show text only on sm and up -->
  </button>

  <!-- View Chats Button -->
<button class="btn btn-sm btn-outline-primary viewChatsBtn" data-id="${p.id}">
  <i class="bi bi-chat-dots"></i>
  <span class="d-none d-sm-inline"> View Chats</span>
</button>


</div>


  </div>
</div>

    `
      )
      .join("");

    $("#myProductList").html(
      html || `<p class="text-muted">You haven't added any products yet.</p>`
    );
  }

  ///Product Details

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
        orderActionHTML = `<span class="badge bg-warning mt-2">Order Pending</span>`;
      } else if (currentOrder.status === "Sold") {
        orderActionHTML = `<span class="badge bg-success mt-2">Sold</span>`;
      }

      const html = `
      <div class="row">
        <div class="col-md-6">
          <img src="${product.image}" alt="${product.name}" class="img-fluid shadow-sm rounded-4 product-image" />
        </div>
        <div class="col-md-6">
          <h3>${product.name}</h3>
          <p class="text-muted">${product.category}</p>
          <h4 class="text-success mb-3">₹${product.price}</h4>
          <p><strong>City:</strong> ${product.city}</p>
          <p><strong>State:</strong> ${product.state}</p>
          <p><strong>Description:</strong> ${product.desc}</p>
          <p><i class="bi bi-person-fill"></i> <strong>Seller:</strong> ${product.sellerId}</p>
          <button class="btn bg-purple text-white chatBtn" data-id="${product.id}">
            <i class="bi bi-chat-dots-fill text-white"></i> Chat with Seller
          </button>
          <div class="mt-3">
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

    if (!loggedInUser || loggedInUser.role !== "buyer") {
      alert("Please login as a buyer to place an order.");
      return;
    }

    // Prevent buyer from ordering their own product
    if (product.sellerId === loggedInUser.username) {
      alert("You cannot order your own product.");
      return;
    }

    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const alreadyOrdered = orders.find(
      (o) => o.productId === product.id && o.buyerId === loggedInUser.username
    );

    if (alreadyOrdered) {
      alert("You have already placed an order for this product.");
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

    alert("✅ Order placed successfully!");
    location.reload(); // Refresh UI to show badge
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

  let filteredOrders = [];

  if (loggedInUser.role === "buyer") {
    filteredOrders = orders.filter(
      (order) => order.buyerId === loggedInUser.username
    );
  } else if (loggedInUser.role === "seller") {
    filteredOrders = orders.filter(
      (order) => order.sellerId === loggedInUser.username
    );
  }

  if (filteredOrders.length === 0) {
    container.html(
      `<div class='alert alert-info'>No orders found for your account.</div>`
    );
    return;
  }

  let html = "";

  filteredOrders.forEach((order) => {
    const product = products.find((p) => p.id === order.productId);
    const buyer = users.find((u) => u.username === order.buyerId);
    const seller = users.find((u) => u.username === order.sellerId);

    let statusHTML = "";

    if (loggedInUser.role === "buyer") {
      statusHTML =
        order.status === "Sold"
          ? `<div class="text-success fw-semibold">✅ Order Successful</div>`
          : `<span class="badge bg-warning text-dark">Pending</span>`;
    } else {
      // for seller side
      statusHTML =
        order.status === "Sold"
          ? `<span class="badge bg-success">Sold</span>`
          : `<span class="badge bg-warning text-dark">Pending</span>`;
    }

    // Only seller can see "Mark as Sold" if order is pending
    const markSoldBtn =
      loggedInUser.role === "seller" && order.status === "Pending"
        ? `<button class="btn btn-sm btn-success mt-2 markSoldBtn" data-id="${order.id}">Mark as Sold</button>`
        : "";

    html += `
    <div class="order-card border rounded-4 p-3 mb-4 shadow-sm bg-white">
      <div class="row g-3 align-items-center">
        <!-- Image -->
        <div class="col-12 col-md-4 text-center text-md-start">
          <img src="${product.image}" alt="${
      product.name
    }" class="img-fluid rounded-3 shadow-sm" style="max-height: 140px; object-fit: contain;" />
        </div>

        <!-- Details -->
        <div class="col-12 col-md-8">
          <div class="d-flex justify-content-between flex-wrap">
            <h5 class="mb-1">${product.name}</h5>
            <small class="text-muted fw-semibold">Order ID: ${order.id}</small>
          </div>

          <p class="text-muted mb-2 small">${product.category}</p>
          <h6 class="text-success mb-2">₹${product.price}</h6>

          <div class="row small">
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
              loggedInUser.role === "buyer"
                ? `<div class="col-6 col-lg-4 mb-1"><strong>Seller:</strong> ${
                    seller ? seller.username : "N/A"
                  }</div>`
                : `<div class="col-6 col-lg-4 mb-1"><strong>Buyer:</strong> ${
                    buyer ? buyer.username : "N/A"
                  }</div>`
            }
            <div class="col-12 mb-2"><strong>Description:</strong> ${
              product.desc
            }</div>
            <div class="col-12 d-flex align-items-center gap-2">
              ${statusHTML}
              ${markSoldBtn}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  });

  container.html(html);

  $(document).on("click", ".markSoldBtn", function () {
    const orderId = $(this).data("id");
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const index = orders.findIndex((order) => order.id == orderId);

    if (index !== -1) {
      orders[index].status = "Sold";
      localStorage.setItem("orders", JSON.stringify(orders));
      alert("✅ Order marked as Sold!");
      location.reload();
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
            <small class="text-muted d-block text-end" style="font-size: 0.7rem;">
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
  <div class="d-flex align-items-center gap-2 text-white">

    <!-- Profile Info -->
    <div class="d-flex align-items-center gap-2">
      <i class="bi bi-person-circle fs-4"></i>
      <div class="d-flex flex-column lh-sm">
        <span class="fw-semibold small">${loggedInUser.username}</span>
        <span class="text-light small">${loggedInUser.role}</span>
      </div>
    </div>
  </div>
   

      <div id="logoutBtnMobile" class="nav-item t">
                <a href="#" class="nav-link text-white">
                          <i class="bi bi-box-arrow-right fs-4 me-2"></i>LogOut
                </a>
            </div>
`);
  } else {
    $header.html(`
      <button class="btn  bg-white me-2" data-bs-toggle="modal" data-bs-target="#loginModal">
        <i class="bi bi-box-arrow-in-right"></i> Login
      </button>
      <button class="btn  bg-white" data-bs-toggle="modal" data-bs-target="#signupModal">
        <i class="bi bi-person-plus"></i> Sign Up
      </button>
    `);
  }
}
