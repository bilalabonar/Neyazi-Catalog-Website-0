// Utility to convert Google Drive links to direct image links
function getDirectImageUrl(url) {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
}

// Utility to fetch and parse Google Sheet CSV
async function fetchProducts() {
    try {
        const response = await fetch(CONFIG.GOOGLE_SHEET_CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const data = results.data.map(item => {
                        return {
                            id: item.id,
                            name: item.name,
                            price: parseFloat(item.price) || 0,
                            category: item.category ? item.category.trim() : '',
                            sizes: item.sizes ? item.sizes.split(',').map(s => s.trim()) : [],
                            colors: item.colors ? item.colors.split(',').map(c => c.trim()) : [],
                            description: item.description || '',
                            // Support multiple images separated by | and convert GDrive links
                            images: item.images ? item.images.split('|').map(i => getDirectImageUrl(i.trim())) : [],
                        };
                    });
                    resolve(data);
                },
                error: function(error) {
                    console.error("PapaParse error:", error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

// Shopping Cart Logic
const CART_STORAGE_KEY = 'labib_cart';

function getCart() {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(product, size, color, quantity = 1) {
    const cart = getCart();
    
    // Check if item with same id, size, and color already exists
    const existingIndex = cart.findIndex(item => 
        item.id === product.id && item.size === size && item.color === color
    );

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            ...product,
            size,
            color,
            quantity
        });
    }
    saveCart(cart);
    
    // Show simple notification
    alert('تمت الإضافة إلى السلة بنجاح!');
}

function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
}

function updateQuantity(index, delta) {
    const cart = getCart();
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
    }
}

function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function getCartCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// Update UI
function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = getCartCount();
    badges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// WhatsApp Checkout
function checkoutViaWhatsApp() {
    const cart = getCart();
    if (cart.length === 0) {
        alert('السلة فارغة!');
        return;
    }

    let message = "مرحباً، أود طلب الآتي:\n\n";
    
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `- الكمية: ${item.quantity}\n`;
        if (item.size) message += `- المقاس: ${item.size}\n`;
        if (item.color) message += `- اللون: ${item.color}\n`;
        message += `- السعر: ${item.price} ج.م\n`;
        message += `- الرابط: ${window.location.origin}/product.html?id=${item.id}\n`;
        message += "------------------\n";
    });

    message += `\n*الإجمالي: ${getCartTotal()} ج.م*\n`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER.replace('+', '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
});
