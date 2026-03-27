/**
 * E-Commerce Domain Patterns
 * 
 * Online Retail, Marketplaces, Shopping Carts
 * 
 * @module domain-intelligence/patterns/ecommerce
 */

import { DomainDefinition, TableNamePattern, ColumnNamePattern, FKPattern, WorkflowPattern, SensitiveDataPattern, DomainCategory } from '../base'

// =============================================================================
// TABLE PATTERNS
// =============================================================================

export const ECOMMERCE_TABLE_PATTERNS: TableNamePattern[] = [
  // Products
  { pattern: 'Product', weight: 9, category: 'master', description: 'Product' },
  { pattern: 'Products', weight: 10, category: 'master', description: 'Products' },
  { pattern: 'Item', weight: 7, category: 'master', description: 'Item' },
  { pattern: 'Items', weight: 8, category: 'master', description: 'Items' },
  { pattern: 'SKU', weight: 7, category: 'master', description: 'SKU' },
  { pattern: 'Variant', weight: 7, category: 'master', description: 'Product variant' },
  { pattern: 'Variants', weight: 8, category: 'master', description: 'Product variants' },
  { pattern: 'ProductVariant', weight: 8, category: 'master', description: 'Product variant' },
  { pattern: 'Merchandise', weight: 6, category: 'master', description: 'Merchandise' },
  { pattern: 'Goods', weight: 5, category: 'master', description: 'Goods' },
  
  // Categories & Organization
  { pattern: 'Category', weight: 8, category: 'lookup', description: 'Category' },
  { pattern: 'Categories', weight: 9, category: 'lookup', description: 'Categories' },
  { pattern: 'CategoryTree', weight: 6, category: 'lookup', description: 'Category hierarchy' },
  { pattern: 'Collection', weight: 7, category: 'lookup', description: 'Product collection' },
  { pattern: 'Collections', weight: 8, category: 'lookup', description: 'Collections' },
  { pattern: 'Brand', weight: 7, category: 'master', description: 'Brand' },
  { pattern: 'Brands', weight: 8, category: 'master', description: 'Brands' },
  { pattern: 'Manufacturer', weight: 6, category: 'master', description: 'Manufacturer' },
  { pattern: 'Tag', weight: 5, category: 'lookup', description: 'Product tag' },
  { pattern: 'Tags', weight: 6, category: 'lookup', description: 'Tags' },
  { pattern: 'Attribute', weight: 6, category: 'lookup', description: 'Product attribute' },
  { pattern: 'Attributes', weight: 7, category: 'lookup', description: 'Attributes' },
  
  // Customers
  { pattern: 'Customer', weight: 8, category: 'master', description: 'Customer' },
  { pattern: 'Customers', weight: 9, category: 'master', description: 'Customers' },
  { pattern: 'Guest', weight: 6, category: 'master', description: 'Guest customer' },
  { pattern: 'Guests', weight: 7, category: 'master', description: 'Guest customers' },
  { pattern: 'Shopper', weight: 5, category: 'master', description: 'Shopper' },
  { pattern: 'Buyer', weight: 5, category: 'master', description: 'Buyer' },
  { pattern: 'Subscriber', weight: 6, category: 'master', description: 'Newsletter subscriber' },
  { pattern: 'Member', weight: 6, category: 'master', description: 'Member' },
  
  // Orders
  { pattern: 'Order', weight: 10, category: 'transaction', description: 'Order' },
  { pattern: 'Orders', weight: 10, category: 'transaction', description: 'Orders' },
  { pattern: 'Purchase', weight: 7, category: 'transaction', description: 'Purchase' },
  { pattern: 'Purchases', weight: 8, category: 'transaction', description: 'Purchases' },
  { pattern: 'Transaction', weight: 6, category: 'transaction', description: 'Transaction' },
  { pattern: 'Transactions', weight: 7, category: 'transaction', description: 'Transactions' },
  { pattern: 'OrderHeader', weight: 7, category: 'transaction', description: 'Order header' },
  { pattern: 'OrderItem', weight: 8, category: 'junction', description: 'Order line item' },
  { pattern: 'OrderItems', weight: 9, category: 'junction', description: 'Order items' },
  { pattern: 'OrderLine', weight: 7, category: 'junction', description: 'Order line' },
  { pattern: 'LineItem', weight: 6, category: 'junction', description: 'Line item' },
  
  // Cart & Checkout
  { pattern: 'Cart', weight: 9, category: 'transaction', description: 'Shopping cart' },
  { pattern: 'Carts', weight: 10, category: 'transaction', description: 'Shopping carts' },
  { pattern: 'ShoppingCart', weight: 9, category: 'transaction', description: 'Shopping cart' },
  { pattern: 'Basket', weight: 7, category: 'transaction', description: 'Basket' },
  { pattern: 'CartItem', weight: 8, category: 'junction', description: 'Cart item' },
  { pattern: 'CartItems', weight: 9, category: 'junction', description: 'Cart items' },
  { pattern: 'Checkout', weight: 7, category: 'transaction', description: 'Checkout session' },
  { pattern: 'CheckoutSession', weight: 7, category: 'transaction', description: 'Checkout session' },
  
  // Wishlist
  { pattern: 'Wishlist', weight: 7, category: 'master', description: 'Wishlist' },
  { pattern: 'Wishlists', weight: 8, category: 'master', description: 'Wishlists' },
  { pattern: 'WishlistItem', weight: 6, category: 'junction', description: 'Wishlist item' },
  { pattern: 'Favorite', weight: 6, category: 'master', description: 'Favorite' },
  { pattern: 'Favorites', weight: 7, category: 'master', description: 'Favorites' },
  { pattern: 'SavedItem', weight: 5, category: 'master', description: 'Saved item' },
  { pattern: 'Registry', weight: 5, category: 'master', description: 'Gift registry' },
  
  // Payments
  { pattern: 'Payment', weight: 8, category: 'transaction', description: 'Payment' },
  { pattern: 'Payments', weight: 9, category: 'transaction', description: 'Payments' },
  { pattern: 'PaymentMethod', weight: 7, category: 'master', description: 'Payment method' },
  { pattern: 'PaymentMethods', weight: 8, category: 'master', description: 'Payment methods' },
  { pattern: 'PaymentTransaction', weight: 7, category: 'transaction', description: 'Payment transaction' },
  { pattern: 'Refund', weight: 7, category: 'transaction', description: 'Refund' },
  { pattern: 'Refunds', weight: 8, category: 'transaction', description: 'Refunds' },
  { pattern: 'Gateway', weight: 6, category: 'config', description: 'Payment gateway' },
  
  // Coupons & Discounts
  { pattern: 'Coupon', weight: 8, category: 'master', description: 'Coupon' },
  { pattern: 'Coupons', weight: 9, category: 'master', description: 'Coupons' },
  { pattern: 'PromoCode', weight: 7, category: 'master', description: 'Promo code' },
  { pattern: 'PromoCodes', weight: 8, category: 'master', description: 'Promo codes' },
  { pattern: 'Discount', weight: 6, category: 'master', description: 'Discount' },
  { pattern: 'Discounts', weight: 7, category: 'master', description: 'Discounts' },
  { pattern: 'Voucher', weight: 6, category: 'master', description: 'Voucher' },
  { pattern: 'Vouchers', weight: 7, category: 'master', description: 'Vouchers' },
  { pattern: 'GiftCard', weight: 7, category: 'master', description: 'Gift card' },
  { pattern: 'GiftCards', weight: 8, category: 'master', description: 'Gift cards' },
  { pattern: 'StoreCredit', weight: 6, category: 'master', description: 'Store credit' },
  
  // Shipping & Fulfillment
  { pattern: 'Shipment', weight: 8, category: 'transaction', description: 'Shipment' },
  { pattern: 'Shipments', weight: 9, category: 'transaction', description: 'Shipments' },
  { pattern: 'Shipping', weight: 7, category: 'transaction', description: 'Shipping record' },
  { pattern: 'ShippingMethod', weight: 6, category: 'master', description: 'Shipping method' },
  { pattern: 'ShippingMethods', weight: 7, category: 'master', description: 'Shipping methods' },
  { pattern: 'Delivery', weight: 6, category: 'transaction', description: 'Delivery' },
  { pattern: 'Deliveries', weight: 7, category: 'transaction', description: 'Deliveries' },
  { pattern: 'Tracking', weight: 5, category: 'transaction', description: 'Shipment tracking' },
  { pattern: 'Fulfillment', weight: 6, category: 'transaction', description: 'Fulfillment' },
  { pattern: 'FulfillmentOrder', weight: 6, category: 'transaction', description: 'Fulfillment order' },
  { pattern: 'Carrier', weight: 5, category: 'master', description: 'Shipping carrier' },
  { pattern: 'Carriers', weight: 6, category: 'master', description: 'Carriers' },
  
  // Returns
  { pattern: 'Return', weight: 8, category: 'transaction', description: 'Return' },
  { pattern: 'Returns', weight: 9, category: 'transaction', description: 'Returns' },
  { pattern: 'ReturnRequest', weight: 7, category: 'transaction', description: 'Return request' },
  { pattern: 'ReturnItem', weight: 6, category: 'junction', description: 'Return item' },
  { pattern: 'RMA', weight: 7, category: 'transaction', description: 'Return merchandise auth' },
  { pattern: 'Exchange', weight: 6, category: 'transaction', description: 'Exchange' },
  { pattern: 'Exchanges', weight: 7, category: 'transaction', description: 'Exchanges' },
  
  // Inventory
  { pattern: 'Inventory', weight: 8, category: 'transaction', description: 'Inventory' },
  { pattern: 'Stock', weight: 7, category: 'transaction', description: 'Stock' },
  { pattern: 'StockLevel', weight: 6, category: 'transaction', description: 'Stock level' },
  { pattern: 'Warehouse', weight: 7, category: 'master', description: 'Warehouse' },
  { pattern: 'Warehouses', weight: 8, category: 'master', description: 'Warehouses' },
  { pattern: 'InventoryMovement', weight: 6, category: 'transaction', description: 'Inventory movement' },
  { pattern: 'StockAdjustment', weight: 5, category: 'transaction', description: 'Stock adjustment' },
  
  // Addresses
  { pattern: 'Address', weight: 6, category: 'master', description: 'Address' },
  { pattern: 'Addresses', weight: 7, category: 'master', description: 'Addresses' },
  { pattern: 'ShippingAddress', weight: 6, category: 'master', description: 'Shipping address' },
  { pattern: 'BillingAddress', weight: 6, category: 'master', description: 'Billing address' },
  
  // Reviews & Ratings
  { pattern: 'Review', weight: 7, category: 'transaction', description: 'Product review' },
  { pattern: 'Reviews', weight: 8, category: 'transaction', description: 'Reviews' },
  { pattern: 'Rating', weight: 6, category: 'transaction', description: 'Rating' },
  { pattern: 'Ratings', weight: 7, category: 'transaction', description: 'Ratings' },
  { pattern: 'Feedback', weight: 5, category: 'transaction', description: 'Feedback' },
  { pattern: 'Testimonial', weight: 5, category: 'transaction', description: 'Testimonial' },
  { pattern: 'Question', weight: 5, category: 'transaction', description: 'Product Q&A' },
  { pattern: 'Questions', weight: 6, category: 'transaction', description: 'Questions' },
  
  // Vendors/Sellers (Marketplace)
  { pattern: 'Vendor', weight: 7, category: 'master', description: 'Vendor/Seller' },
  { pattern: 'Vendors', weight: 8, category: 'master', description: 'Vendors/Sellers' },
  { pattern: 'Seller', weight: 7, category: 'master', description: 'Seller' },
  { pattern: 'Sellers', weight: 8, category: 'master', description: 'Sellers' },
  { pattern: 'Merchant', weight: 6, category: 'master', description: 'Merchant' },
  { pattern: 'Merchants', weight: 7, category: 'master', description: 'Merchants' },
  { pattern: 'Store', weight: 6, category: 'master', description: 'Store' },
  { pattern: 'Stores', weight: 7, category: 'master', description: 'Stores' },
  { pattern: 'Marketplace', weight: 5, category: 'master', description: 'Marketplace' },
  { pattern: 'Commission', weight: 6, category: 'transaction', description: 'Commission' },
  { pattern: 'Commissions', weight: 7, category: 'transaction', description: 'Commissions' },
  { pattern: 'Payout', weight: 5, category: 'transaction', description: 'Vendor payout' },
  { pattern: 'Payouts', weight: 6, category: 'transaction', description: 'Payouts' },
  
  // Loyalty
  { pattern: 'Loyalty', weight: 6, category: 'master', description: 'Loyalty program' },
  { pattern: 'LoyaltyProgram', weight: 7, category: 'master', description: 'Loyalty program' },
  { pattern: 'LoyaltyPoints', weight: 6, category: 'transaction', description: 'Loyalty points' },
  { pattern: 'Reward', weight: 5, category: 'master', description: 'Reward' },
  { pattern: 'Rewards', weight: 6, category: 'master', description: 'Rewards' },
  { pattern: 'Point', weight: 4, category: 'transaction', description: 'Points' },
  { pattern: 'Points', weight: 5, category: 'transaction', description: 'Points' },
  
  // Promotions
  { pattern: 'Promotion', weight: 6, category: 'master', description: 'Promotion' },
  { pattern: 'Promotions', weight: 7, category: 'master', description: 'Promotions' },
  { pattern: 'FlashSale', weight: 5, category: 'transaction', description: 'Flash sale' },
  { pattern: 'FlashSales', weight: 6, category: 'transaction', description: 'Flash sales' },
  { pattern: 'Bundle', weight: 5, category: 'master', description: 'Product bundle' },
  { pattern: 'Bundles', weight: 6, category: 'master', description: 'Bundles' },
]

// =============================================================================
// COLUMN PATTERNS
// =============================================================================

export const ECOMMERCE_COLUMN_PATTERNS: ColumnNamePattern[] = [
  // Product identifiers
  { pattern: 'ProductId', weight: 7, semanticType: 'product_id', description: 'Product ID' },
  { pattern: 'product_id', weight: 7, semanticType: 'product_id', description: 'Product ID' },
  { pattern: 'SKU', weight: 8, semanticType: 'sku', description: 'Stock keeping unit' },
  { pattern: 'sku', weight: 8, semanticType: 'sku', description: 'Stock keeping unit' },
  { pattern: 'UPC', weight: 6, semanticType: 'upc', description: 'Universal product code' },
  { pattern: 'EAN', weight: 6, semanticType: 'ean', description: 'European article number' },
  { pattern: 'ISBN', weight: 5, semanticType: 'isbn', description: 'ISBN' },
  { pattern: 'MPN', weight: 5, semanticType: 'mpn', description: 'Manufacturer part number' },
  
  // Order identifiers
  { pattern: 'OrderId', weight: 8, semanticType: 'order_id', description: 'Order ID' },
  { pattern: 'order_id', weight: 8, semanticType: 'order_id', description: 'Order ID' },
  { pattern: 'OrderNumber', weight: 7, semanticType: 'order_number', description: 'Order number' },
  { pattern: 'order_number', weight: 7, semanticType: 'order_number', description: 'Order number' },
  { pattern: 'OrderNo', weight: 6, semanticType: 'order_number', description: 'Order number' },
  { pattern: 'InvoiceNumber', weight: 6, semanticType: 'invoice_number', description: 'Invoice number' },
  { pattern: 'TransactionId', weight: 6, semanticType: 'transaction_id', description: 'Transaction ID' },
  
  // Customer identifiers
  { pattern: 'CustomerId', weight: 7, semanticType: 'customer_id', description: 'Customer ID' },
  { pattern: 'customer_id', weight: 7, semanticType: 'customer_id', description: 'Customer ID' },
  { pattern: 'GuestId', weight: 6, semanticType: 'guest_id', description: 'Guest ID' },
  { pattern: 'SessionId', weight: 6, semanticType: 'session_id', description: 'Session ID' },
  { pattern: 'session_id', weight: 6, semanticType: 'session_id', description: 'Session ID' },
  { pattern: 'VisitorId', weight: 5, semanticType: 'visitor_id', description: 'Visitor ID' },
  
  // Cart identifiers
  { pattern: 'CartId', weight: 7, semanticType: 'cart_id', description: 'Cart ID' },
  { pattern: 'cart_id', weight: 7, semanticType: 'cart_id', description: 'Cart ID' },
  { pattern: 'BasketId', weight: 6, semanticType: 'cart_id', description: 'Basket ID' },
  
  // Pricing - Sensitive
  { pattern: 'Price', weight: 6, semanticType: 'price', description: 'Price' },
  { pattern: 'price', weight: 6, semanticType: 'price', description: 'Price' },
  { pattern: 'UnitPrice', weight: 6, semanticType: 'price', description: 'Unit price' },
  { pattern: 'unit_price', weight: 6, semanticType: 'price', description: 'Unit price' },
  { pattern: 'SalePrice', weight: 6, semanticType: 'sale_price', description: 'Sale price' },
  { pattern: 'sale_price', weight: 6, semanticType: 'sale_price', description: 'Sale price' },
  { pattern: 'RegularPrice', weight: 5, semanticType: 'price', description: 'Regular price' },
  { pattern: 'OriginalPrice', weight: 5, semanticType: 'price', description: 'Original price' },
  { pattern: 'CostPrice', weight: 6, semanticType: 'cost', description: 'Cost price', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'cost_price', weight: 6, semanticType: 'cost', description: 'Cost price', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'WholesalePrice', weight: 5, semanticType: 'wholesale', description: 'Wholesale price', sensitivity: 'CONFIDENTIAL' },
  
  // Order amounts
  { pattern: 'Total', weight: 6, semanticType: 'total', description: 'Total' },
  { pattern: 'TotalAmount', weight: 7, semanticType: 'total', description: 'Total amount' },
  { pattern: 'Subtotal', weight: 6, semanticType: 'subtotal', description: 'Subtotal' },
  { pattern: 'subtotal', weight: 6, semanticType: 'subtotal', description: 'Subtotal' },
  { pattern: 'GrandTotal', weight: 6, semanticType: 'total', description: 'Grand total' },
  { pattern: 'OrderTotal', weight: 6, semanticType: 'total', description: 'Order total' },
  { pattern: 'TaxAmount', weight: 5, semanticType: 'tax', description: 'Tax amount' },
  { pattern: 'tax_amount', weight: 5, semanticType: 'tax', description: 'Tax amount' },
  { pattern: 'ShippingCost', weight: 5, semanticType: 'shipping', description: 'Shipping cost' },
  { pattern: 'shipping_cost', weight: 5, semanticType: 'shipping', description: 'Shipping cost' },
  { pattern: 'ShippingAmount', weight: 5, semanticType: 'shipping', description: 'Shipping amount' },
  { pattern: 'DiscountAmount', weight: 5, semanticType: 'discount', description: 'Discount amount' },
  { pattern: 'discount_amount', weight: 5, semanticType: 'discount', description: 'Discount amount' },
  
  // Quantity
  { pattern: 'Quantity', weight: 5, semanticType: 'quantity', description: 'Quantity' },
  { pattern: 'quantity', weight: 5, semanticType: 'quantity', description: 'Quantity' },
  { pattern: 'Qty', weight: 5, semanticType: 'quantity', description: 'Quantity' },
  { pattern: 'qty', weight: 5, semanticType: 'quantity', description: 'Quantity' },
  { pattern: 'QuantityOrdered', weight: 6, semanticType: 'quantity', description: 'Quantity ordered' },
  { pattern: 'QuantityShipped', weight: 5, semanticType: 'quantity', description: 'Quantity shipped' },
  { pattern: 'QuantityReturned', weight: 5, semanticType: 'quantity', description: 'Quantity returned' },
  { pattern: 'StockQuantity', weight: 6, semanticType: 'quantity', description: 'Stock quantity' },
  { pattern: 'QtyInStock', weight: 5, semanticType: 'quantity', description: 'Quantity in stock' },
  
  // Payment - PCI
  { pattern: 'CreditCard', weight: 10, semanticType: 'credit_card', description: 'Credit card', sensitivity: 'PCI' },
  { pattern: 'credit_card', weight: 10, semanticType: 'credit_card', description: 'Credit card', sensitivity: 'PCI' },
  { pattern: 'CardNumber', weight: 10, semanticType: 'card_number', description: 'Card number', sensitivity: 'PCI' },
  { pattern: 'card_number', weight: 10, semanticType: 'card_number', description: 'Card number', sensitivity: 'PCI' },
  { pattern: 'PAN', weight: 10, semanticType: 'card_number', description: 'Primary account number', sensitivity: 'PCI' },
  { pattern: 'CVV', weight: 10, semanticType: 'cvv', description: 'Card verification value', sensitivity: 'PCI' },
  { pattern: 'cvv', weight: 10, semanticType: 'cvv', description: 'Card verification value', sensitivity: 'PCI' },
  { pattern: 'CVC', weight: 10, semanticType: 'cvv', description: 'Card verification code', sensitivity: 'PCI' },
  { pattern: 'ExpiryDate', weight: 8, semanticType: 'expiry', description: 'Card expiry date', sensitivity: 'PCI' },
  { pattern: 'expiry_date', weight: 8, semanticType: 'expiry', description: 'Card expiry date', sensitivity: 'PCI' },
  { pattern: 'ExpirationDate', weight: 8, semanticType: 'expiry', description: 'Expiration date', sensitivity: 'PCI' },
  { pattern: 'CardExpiry', weight: 8, semanticType: 'expiry', description: 'Card expiry', sensitivity: 'PCI' },
  
  // Customer PII
  { pattern: 'Email', weight: 6, semanticType: 'email', description: 'Email', sensitivity: 'PII' },
  { pattern: 'email', weight: 6, semanticType: 'email', description: 'Email', sensitivity: 'PII' },
  { pattern: 'Phone', weight: 5, semanticType: 'phone', description: 'Phone', sensitivity: 'PII' },
  { pattern: 'phone', weight: 5, semanticType: 'phone', description: 'Phone', sensitivity: 'PII' },
  { pattern: 'Address', weight: 5, semanticType: 'address', description: 'Address', sensitivity: 'PII' },
  { pattern: 'address', weight: 5, semanticType: 'address', description: 'Address', sensitivity: 'PII' },
  { pattern: 'ShippingAddress', weight: 5, semanticType: 'address', description: 'Shipping address', sensitivity: 'PII' },
  { pattern: 'BillingAddress', weight: 5, semanticType: 'address', description: 'Billing address', sensitivity: 'PII' },
  
  // Order status
  { pattern: 'OrderStatus', weight: 7, semanticType: 'status', description: 'Order status' },
  { pattern: 'order_status', weight: 7, semanticType: 'status', description: 'Order status' },
  { pattern: 'PaymentStatus', weight: 6, semanticType: 'status', description: 'Payment status' },
  { pattern: 'payment_status', weight: 6, semanticType: 'status', description: 'Payment status' },
  { pattern: 'FulfillmentStatus', weight: 6, semanticType: 'status', description: 'Fulfillment status' },
  { pattern: 'fulfillment_status', weight: 6, semanticType: 'status', description: 'Fulfillment status' },
  { pattern: 'ShippingStatus', weight: 5, semanticType: 'status', description: 'Shipping status' },
  { pattern: 'ReturnStatus', weight: 5, semanticType: 'status', description: 'Return status' },
  
  // Coupon/Discount
  { pattern: 'CouponCode', weight: 7, semanticType: 'coupon_code', description: 'Coupon code' },
  { pattern: 'coupon_code', weight: 7, semanticType: 'coupon_code', description: 'Coupon code' },
  { pattern: 'PromoCode', weight: 6, semanticType: 'coupon_code', description: 'Promo code' },
  { pattern: 'promo_code', weight: 6, semanticType: 'coupon_code', description: 'Promo code' },
  { pattern: 'DiscountCode', weight: 6, semanticType: 'coupon_code', description: 'Discount code' },
  { pattern: 'VoucherCode', weight: 5, semanticType: 'coupon_code', description: 'Voucher code' },
  { pattern: 'CouponId', weight: 6, semanticType: 'coupon_id', description: 'Coupon ID' },
  { pattern: 'coupon_id', weight: 6, semanticType: 'coupon_id', description: 'Coupon ID' },
  
  // Shipping
  { pattern: 'TrackingNumber', weight: 7, semanticType: 'tracking_number', description: 'Tracking number' },
  { pattern: 'tracking_number', weight: 7, semanticType: 'tracking_number', description: 'Tracking number' },
  { pattern: 'TrackingUrl', weight: 5, semanticType: 'tracking_url', description: 'Tracking URL' },
  { pattern: 'CarrierId', weight: 5, semanticType: 'carrier_id', description: 'Carrier ID' },
  { pattern: 'ShippingMethodId', weight: 5, semanticType: 'shipping_method', description: 'Shipping method ID' },
  
  // Review
  { pattern: 'Rating', weight: 5, semanticType: 'rating', description: 'Rating' },
  { pattern: 'rating', weight: 5, semanticType: 'rating', description: 'Rating' },
  { pattern: 'ReviewTitle', weight: 4, semanticType: 'title', description: 'Review title' },
  { pattern: 'ReviewContent', weight: 4, semanticType: 'content', description: 'Review content' },
  { pattern: 'IsVerified', weight: 4, semanticType: 'verified', description: 'Verified purchase' },
  { pattern: 'HelpfulCount', weight: 4, semanticType: 'count', description: 'Helpful count' },
  
  // Loyalty
  { pattern: 'Points', weight: 5, semanticType: 'points', description: 'Loyalty points' },
  { pattern: 'points', weight: 5, semanticType: 'points', description: 'Loyalty points' },
  { pattern: 'LoyaltyPoints', weight: 6, semanticType: 'points', description: 'Loyalty points' },
  { pattern: 'PointsEarned', weight: 5, semanticType: 'points', description: 'Points earned' },
  { pattern: 'PointsRedeemed', weight: 5, semanticType: 'points', description: 'Points redeemed' },
  { pattern: 'PointsBalance', weight: 5, semanticType: 'points', description: 'Points balance' },
  { pattern: 'Tier', weight: 4, semanticType: 'tier', description: 'Loyalty tier' },
  
  // Vendor/Marketplace
  { pattern: 'VendorId', weight: 6, semanticType: 'vendor_id', description: 'Vendor ID' },
  { pattern: 'vendor_id', weight: 6, semanticType: 'vendor_id', description: 'Vendor ID' },
  { pattern: 'SellerId', weight: 6, semanticType: 'vendor_id', description: 'Seller ID' },
  { pattern: 'seller_id', weight: 6, semanticType: 'vendor_id', description: 'Seller ID' },
  { pattern: 'MerchantId', weight: 5, semanticType: 'vendor_id', description: 'Merchant ID' },
  { pattern: 'StoreId', weight: 5, semanticType: 'store_id', description: 'Store ID' },
  { pattern: 'store_id', weight: 5, semanticType: 'store_id', description: 'Store ID' },
  { pattern: 'CommissionRate', weight: 5, semanticType: 'rate', description: 'Commission rate' },
  { pattern: 'CommissionAmount', weight: 5, semanticType: 'amount', description: 'Commission amount' },
]

// =============================================================================
// FK PATTERNS
// =============================================================================

export const ECOMMERCE_FK_PATTERNS: FKPattern[] = [
  { columnPattern: /^ProductId$/i, referencesTable: 'Products', weight: 7, description: 'Reference to product' },
  { columnPattern: /^product_id$/i, referencesTable: 'Products', weight: 7, description: 'Reference to product' },
  { columnPattern: /^VariantId$/i, referencesTable: 'ProductVariants', weight: 6, description: 'Reference to variant' },
  { columnPattern: /^variant_id$/i, referencesTable: 'ProductVariants', weight: 6, description: 'Reference to variant' },
  { columnPattern: /^CustomerId$/i, referencesTable: 'Customers', weight: 7, description: 'Reference to customer' },
  { columnPattern: /^customer_id$/i, referencesTable: 'Customers', weight: 7, description: 'Reference to customer' },
  { columnPattern: /^OrderId$/i, referencesTable: 'Orders', weight: 8, description: 'Reference to order' },
  { columnPattern: /^order_id$/i, referencesTable: 'Orders', weight: 8, description: 'Reference to order' },
  { columnPattern: /^CartId$/i, referencesTable: 'Carts', weight: 7, description: 'Reference to cart' },
  { columnPattern: /^cart_id$/i, referencesTable: 'Carts', weight: 7, description: 'Reference to cart' },
  { columnPattern: /^CategoryId$/i, referencesTable: 'Categories', weight: 6, description: 'Reference to category' },
  { columnPattern: /^category_id$/i, referencesTable: 'Categories', weight: 6, description: 'Reference to category' },
  { columnPattern: /^BrandId$/i, referencesTable: 'Brands', weight: 5, description: 'Reference to brand' },
  { columnPattern: /^brand_id$/i, referencesTable: 'Brands', weight: 5, description: 'Reference to brand' },
  { columnPattern: /^CouponId$/i, referencesTable: 'Coupons', weight: 6, description: 'Reference to coupon' },
  { columnPattern: /^coupon_id$/i, referencesTable: 'Coupons', weight: 6, description: 'Reference to coupon' },
  { columnPattern: /^ShipmentId$/i, referencesTable: 'Shipments', weight: 6, description: 'Reference to shipment' },
  { columnPattern: /^shipment_id$/i, referencesTable: 'Shipments', weight: 6, description: 'Reference to shipment' },
  { columnPattern: /^ReturnId$/i, referencesTable: 'Returns', weight: 6, description: 'Reference to return' },
  { columnPattern: /^return_id$/i, referencesTable: 'Returns', weight: 6, description: 'Reference to return' },
  { columnPattern: /^PaymentMethodId$/i, referencesTable: 'PaymentMethods', weight: 5, description: 'Reference to payment method' },
  { columnPattern: /^AddressId$/i, referencesTable: 'Addresses', weight: 5, description: 'Reference to address' },
  { columnPattern: /^ShippingAddressId$/i, referencesTable: 'Addresses', weight: 5, description: 'Reference to shipping address' },
  { columnPattern: /^BillingAddressId$/i, referencesTable: 'Addresses', weight: 5, description: 'Reference to billing address' },
  { columnPattern: /^VendorId$/i, referencesTable: 'Vendors', weight: 6, description: 'Reference to vendor' },
  { columnPattern: /^vendor_id$/i, referencesTable: 'Vendors', weight: 6, description: 'Reference to vendor' },
  { columnPattern: /^SellerId$/i, referencesTable: 'Vendors', weight: 6, description: 'Reference to seller' },
  { columnPattern: /^seller_id$/i, referencesTable: 'Vendors', weight: 6, description: 'Reference to seller' },
  { columnPattern: /^WarehouseId$/i, referencesTable: 'Warehouses', weight: 5, description: 'Reference to warehouse' },
]

// =============================================================================
// WORKFLOW PATTERNS
// =============================================================================

export const ECOMMERCE_WORKFLOWS: WorkflowPattern[] = [
  {
    name: 'Order Fulfillment',
    tableName: /^Order/i,
    statusColumn: 'Status',
    states: ['Pending', 'Confirmed', 'Processing', 'PartiallyShipped', 'Shipped', 'Delivered', 'Cancelled', 'Refunded', 'OnHold'],
    weight: 10
  },
  {
    name: 'Payment Processing',
    tableName: /^Payment|^PaymentTransaction/i,
    statusColumn: 'Status',
    states: ['Initiated', 'Pending', 'Authorized', 'Captured', 'Completed', 'Failed', 'Voided', 'Refunded', 'Chargeback'],
    weight: 9
  },
  {
    name: 'Shipment Tracking',
    tableName: /^Shipment/i,
    statusColumn: 'Status',
    states: ['Pending', 'LabelCreated', 'PickedUp', 'InTransit', 'OutForDelivery', 'Delivered', 'FailedDelivery', 'Returned'],
    weight: 8
  },
  {
    name: 'Return Process',
    tableName: /^Return|^RMA/i,
    statusColumn: 'Status',
    states: ['Requested', 'Approved', 'Received', 'Inspected', 'Refunded', 'Exchanged', 'Rejected', 'Closed'],
    weight: 7
  },
  {
    name: 'Cart Lifecycle',
    tableName: /^Cart/i,
    statusColumn: 'Status',
    states: ['Active', 'Abandoned', 'Converted', 'Expired'],
    weight: 6
  },
  {
    name: 'Customer Ticket',
    tableName: /^Ticket|^SupportTicket/i,
    statusColumn: 'Status',
    states: ['Open', 'InProgress', 'WaitingCustomer', 'WaitingInternal', 'Resolved', 'Closed'],
    weight: 5
  },
]

// =============================================================================
// SENSITIVE DATA PATTERNS
// =============================================================================

export const ECOMMERCE_SENSITIVE_PATTERNS: SensitiveDataPattern[] = [
  {
    name: 'Credit Card Number',
    patterns: [
      /\bcredit_card\b/i,
      /\bcard_number\b/i,
      /\bcard_no\b/i,
      /\bpan\b/i,
      /\baccount_number\b/i,
    ],
    sensitivity: 'PCI',
    domainWeight: 10,
    description: 'Credit card number - PCI DSS protected'
  },
  {
    name: 'CVV/CVC',
    patterns: [
      /\bcvv\b/i,
      /\bcvc\b/i,
      /\bcvv2\b/i,
      /\bsecurity_code\b/i,
    ],
    sensitivity: 'PCI',
    domainWeight: 10,
    description: 'Card verification value - must never be stored'
  },
  {
    name: 'Card Expiry',
    patterns: [
      /\bexpiry_date\b/i,
      /\bexpiration_date\b/i,
      /\bcard_expiry\b/i,
      /\bexp_date\b/i,
    ],
    sensitivity: 'PCI',
    domainWeight: 8,
    description: 'Card expiry date - PCI DSS protected'
  },
  {
    name: 'Customer PII',
    patterns: [
      /\bemail\b/i,
      /\bphone\b/i,
      /\baddress\b/i,
      /\bshipping_address\b/i,
      /\bbilling_address\b/i,
    ],
    sensitivity: 'PII',
    domainWeight: 7,
    description: 'Customer personal information - GDPR protected'
  },
  {
    name: 'Pricing/Cost',
    patterns: [
      /\bcost_price\b/i,
      /\bwholesale_price\b/i,
      /\bmargin\b/i,
      /\bprofit_margin\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 5,
    description: 'Internal pricing information'
  },
]

// =============================================================================
// TABLE CATEGORIES
// =============================================================================

export const ECOMMERCE_TABLE_CATEGORIES: Record<DomainCategory, string[]> = {
  master: ['Products', 'Customers', 'Categories', 'Brands', 'Vendors', 'Warehouses', 'Coupons', 'GiftCards', 'PaymentMethods'],
  transaction: ['Orders', 'Payments', 'Carts', 'Shipments', 'Returns', 'Refunds', 'Reviews', 'Transactions'],
  lookup: ['Statuses', 'TaxRates', 'ShippingMethods', 'Carriers', 'Countries', 'Currencies'],
  audit: ['OrderHistory', 'PaymentHistory', 'StockMovements', 'PriceHistory'],
  config: ['StoreSettings', 'TaxConfig', 'ShippingConfig', 'PaymentGateways'],
  workflow: ['FulfillmentOrders', 'ReturnRequests', 'SupportTickets'],
  reporting: ['SalesReports', 'ProductAnalytics', 'CustomerAnalytics'],
  junction: [],
    integration: ['PaymentGateways', 'ShippingProviders', 'Marketplaces']
}

// =============================================================================
// DOMAIN DEFINITION
// =============================================================================

export const ECOMMERCE_DOMAIN: DomainDefinition = {
  domain: 'ecommerce',
  displayName: 'E-Commerce / Online Retail',
  description: 'E-Commerce platforms covering Online Retail, Marketplaces, Shopping Carts, Payment Processing, and Order Fulfillment',
  industries: [
    'Online Retail',
    'Marketplaces',
    'Direct-to-Consumer',
    'Subscription Commerce',
    'B2B E-Commerce',
    'Digital Products',
    'Food & Grocery Delivery',
    'Fashion & Apparel'
  ],
  
  tablePatterns: ECOMMERCE_TABLE_PATTERNS,
  columnPatterns: ECOMMERCE_COLUMN_PATTERNS,
  fkPatterns: ECOMMERCE_FK_PATTERNS,
  workflows: ECOMMERCE_WORKFLOWS,
  sensitivePatterns: ECOMMERCE_SENSITIVE_PATTERNS,
  
  tableCategories: ECOMMERCE_TABLE_CATEGORIES,
  
  keywords: [
    'product', 'item', 'sku', 'variant', 'merchandise',
    'order', 'cart', 'checkout', 'purchase', 'transaction',
    'customer', 'guest', 'shopper', 'buyer', 'subscriber',
    'payment', 'refund', 'gateway', 'transaction',
    'shipment', 'delivery', 'shipping', 'fulfillment', 'tracking',
    'return', 'rma', 'exchange',
    'coupon', 'promo', 'discount', 'voucher', 'gift_card',
    'category', 'brand', 'collection', 'tag',
    'review', 'rating', 'feedback',
    'vendor', 'seller', 'merchant', 'marketplace',
    'inventory', 'stock', 'warehouse',
    'loyalty', 'points', 'rewards',
    'checkout', 'abandoned', 'conversion'
  ],
  
  specificity: 9
}
