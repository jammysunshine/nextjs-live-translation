-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_categories table
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Create menu_items table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category_id UUID REFERENCES menu_categories(id),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table (renamed from order_details for clarity, details will be in order_items)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC(10, 2) NOT NULL,
    order_type TEXT NOT NULL, -- 'pickup' or 'delivery'
    payment_method TEXT NOT NULL, -- 'prepaid' or 'cash_on_delivery'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    delivery_address_id UUID REFERENCES addresses(id),
    order_status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table to store individual items in an order
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL, -- Price at the time of order
    notes TEXT
);

-- Create addresses table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    landmark TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery_zones table
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    min_zip_code TEXT NOT NULL, -- For simplicity, using zip code ranges
    max_zip_code TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table (detailed transactions)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
    transaction_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- 'successful', 'failed', 'refunded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
