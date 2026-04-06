import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse optional filters
    const productIdParam = searchParams.get('productId')
    const fromDateParam = searchParams.get('fromDate')
    const toDateParam = searchParams.get('toDate')

    const productId = productIdParam ? parseInt(productIdParam, 10) : null
    const hasDateRange = fromDateParam && toDateParam

    let fromDate: Date | null = null
    let toDate: Date | null = null
    if (hasDateRange) {
      fromDate = new Date(fromDateParam!)
      toDate = new Date(toDateParam!)
      toDate.setHours(23, 59, 59, 999)
    }

    // Fetch all active products
    const productWhere: Record<string, unknown> = { isActive: true }
    if (productId && !isNaN(productId)) {
      productWhere.id = productId
    }

    const products = await db.product.findMany({
      where: productWhere,
      orderBy: {
        pname: 'asc',
      },
    })

    // For each product, calculate qty in, qty out, and values
    const productData = await Promise.all(
      products.map(async (product) => {
        // Build date filter for purchase details
        const purchaseWhere: Record<string, unknown> = { productId: product.id }
        if (hasDateRange && fromDate && toDate) {
          purchaseWhere.purchaseDate = {
            gte: fromDate,
            lte: toDate,
          }
        }

        // Build date filter for sale details
        const saleWhere: Record<string, unknown> = { productId: product.id }
        if (hasDateRange && fromDate && toDate) {
          saleWhere.saleDate = {
            gte: fromDate,
            lte: toDate,
          }
        }

        // Fetch purchase details (qty in)
        const purchaseDetails = await db.purchaseDetail.findMany({
          where: purchaseWhere,
          select: {
            qtyIn: true,
            totalAmount: true,
          },
        })

        // Fetch sale details (qty out)
        const saleDetails = await db.saleDetail.findMany({
          where: saleWhere,
          select: {
            qtyOut: true,
            totalAmount: true,
          },
        })

        const totalQtyIn = purchaseDetails.reduce((sum, pd) => sum + (pd.qtyIn || 0), 0)
        const totalQtyOut = saleDetails.reduce((sum, sd) => sum + (sd.qtyOut || 0), 0)
        const currentStock = totalQtyIn - totalQtyOut
        const totalPurchaseValue = purchaseDetails.reduce((sum, pd) => sum + (pd.totalAmount || 0), 0)
        const totalSaleValue = saleDetails.reduce((sum, sd) => sum + (sd.totalAmount || 0), 0)

        // Calculate profit margin
        const profitMargin = product.salePrice > 0
          ? ((product.salePrice - product.costPrice) / product.salePrice) * 100
          : 0

        return {
          productId: product.id,
          productName: product.pname,
          unit: product.punit || 'PCS',
          costPrice: product.costPrice || 0,
          salePrice: product.salePrice || 0,
          totalQtyIn,
          totalQtyOut,
          currentStock,
          totalPurchaseValue,
          totalSaleValue,
          profitMargin: Math.round(profitMargin * 10) / 10,
        }
      })
    )

    // Summary calculations
    const totalProducts = productData.length
    const totalPurchaseValue = productData.reduce((sum, p) => sum + p.totalPurchaseValue, 0)
    const totalSaleValue = productData.reduce((sum, p) => sum + p.totalSaleValue, 0)
    const totalProfit = totalSaleValue - totalPurchaseValue

    return NextResponse.json({
      success: true,
      data: {
        products: productData,
        summary: {
          totalProducts,
          totalPurchaseValue,
          totalSaleValue,
          totalProfit,
        },
      },
    })
  } catch (error) {
    console.error('Stock Report Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
