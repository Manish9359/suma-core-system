import { useParams } from "react-router-dom";
import { salesApi, api, purchasingApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState } from "@/components/LoadingState";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { amountToWords } from "@/lib/amountToWords";
import { QRCodeSVG } from "qrcode.react";

/* ─── helpers ─── */
const inr = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoicePrint() {
  const { id, type } = useParams<{ id: string; type?: string }>();
  const isQuote = type === "quotation";
  const isPO = type === "purchase_order";
  const isPR = type === "purchase_receipt";

  const { data: rawData, isLoading, error } = useApiQuery(
    ["doc", type, id],
    () => {
      if (isQuote) return salesApi.getQuotation(id!);
      if (isPO) return purchasingApi.getOrder(id!);
      if (isPR) return purchasingApi.getReceipt(id!);
      return salesApi.getInvoice(id!);
    }
  );
  const data = rawData as any;
  const { data: co } = useApiQuery(["settings", "company"], () =>
    api.get<any>("/api/v1/settings/company")
  );

  if (isLoading) return <LoadingState message={`Loading ${type || "invoice"}...`} />;
  if (error || !data) return <ErrorState message={`Could not load ${type || "invoice"}.`} />;

  /* ─── derived data ─── */
  const customerName = data.customer_name || data.vendor_name || data.supplier_name || data.customer || "";
  const customerAddr = data.customer_address || data.vendor_address || data.supplier_address || "";
  const customerPhone = data.customer_contact || data.vendor_contact || "";
  const customerEmail = data.customer_email || data.vendor_email || "";
  const customerGst = data.customer_gst || data.vendor_gst || "";

  const items: any[] = data.items || [];
  const gstRate = Number(data.custom_data?.gst_rate || 18);
  const halfGst = gstRate / 2;
  const discountTotal = Number(data.custom_data?.discount || 0);
  const subtotal = Number(data.amount || 0);
  const discFraction = subtotal > 0 ? discountTotal / subtotal : 0;

  let totalQty = 0;
  let calcSubtotal = 0;
  let calcCgst = 0;
  let calcSgst = 0;
  let calcGrandTotal = 0;

  const enrichedItems = items.map((item: any) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const lineAmt = qty * rate;
    const discPct = Number(item.disc_pct || 0);
    const disc = discPct > 0 ? lineAmt * discPct / 100 : lineAmt * discFraction;
    const taxable = lineAmt - disc;
    const cgst = parseFloat((taxable * halfGst / 100).toFixed(2));
    const sgst = cgst;
    const total = taxable + cgst + sgst;
    totalQty += qty;
    calcSubtotal += taxable;
    calcCgst += cgst;
    calcSgst += sgst;
    calcGrandTotal += total;
    return { ...item, qty, rate, lineAmt, disc: parseFloat(disc.toFixed(2)), taxable, cgst, sgst, total };
  });

  const grandTotal = Number(data.grand_total || calcGrandTotal);
  const docLabel = isQuote ? "Quotation" : isPO ? "Purchase Order" : isPR ? "Goods Receipt" : "Tax Invoice";
  const docNumLabel = isQuote ? "Quotation#" : isPO ? "PO#" : isPR ? "GR#" : "Invoice#";

  const companyName = co?.company_name || "SUMA SURVEILLANCE TECH PVT. LTD.";
  const cin = co?.cin || "";

  return (
    <div className="bg-white min-h-screen text-black font-sans text-[11.5px] leading-relaxed print:p-0">
      {/* ═══════════════ PAGE 1 ═══════════════ */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-[10mm] print:max-w-none">
        {/* Top label */}
        <p className="text-center text-[11px] text-gray-500 mb-1 tracking-wide">
          TAX INVOICE (Original for Recipient)
        </p>

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start border-b-2 border-orange-500 pb-4 mb-5">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-orange-600 tracking-tight">{companyName}</h1>
            {co?.formerly && <p className="text-[10px] text-gray-500">(Formerly known as {co.formerly})</p>}
            <p className="text-gray-600 whitespace-pre-wrap mt-1 text-[11px]">{co?.address || ""}</p>
            {cin && <p className="text-[10px] text-gray-500 mt-0.5">CIN: {cin}</p>}
          </div>
          <div className="text-right text-[11px] text-gray-700 shrink-0 ml-4">
            {co?.phone && <p>📞 {co.phone}</p>}
            {co?.email && <p>✉ {co.email}</p>}
            {co?.gstin && <p className="font-bold mt-1">GSTIN: {co.gstin}</p>}
          </div>
        </div>

        {/* ── CUSTOMER + INVOICE META ── */}
        <div className="flex gap-6 mb-5">
          {/* Left: Customer */}
          <div className="flex-1 border border-gray-200 rounded p-4 bg-gray-50/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              👤 Customer & Shipping Address
            </p>
            <p className="text-base font-black text-gray-900">{customerName}</p>
            {customerAddr && <p className="text-gray-600 whitespace-pre-wrap mt-1">{customerAddr}</p>}
            {customerPhone && <p className="mt-1">📞 {customerPhone}</p>}
            {customerEmail && <p>✉ {customerEmail}</p>}
            {customerGst && <p className="font-bold mt-1">GSTIN: {customerGst}</p>}
            {data.place_of_supply && <p className="text-gray-500 text-[10px] mt-1">Place of Supply: {data.place_of_supply}</p>}
          </div>

          {/* Right: Invoice meta */}
          <div className="w-80 shrink-0">
            <h2 className="text-2xl font-black text-gray-800 mb-3">
              {docNumLabel} {data.id}
            </h2>
            <table className="text-sm w-full border border-gray-300">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-1.5 font-bold text-gray-600 bg-gray-50 w-32">{isQuote ? "Date" : "Invoice Date:"}</td>
                  <td className="px-3 py-1.5 font-semibold">{data.date ? format(new Date(data.date), "dd/MM/yyyy") : "—"}</td>
                </tr>
                {data.sales_order && (
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1.5 font-bold text-gray-600 bg-gray-50">Sale Order:</td>
                    <td className="px-3 py-1.5 font-semibold">{data.sales_order}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-1.5 font-bold text-gray-600 bg-gray-50">Reference:</td>
                  <td className="px-3 py-1.5 font-semibold">{data.id}</td>
                </tr>
                {isQuote && data.valid_till && (
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1.5 font-bold text-gray-600 bg-gray-50">Valid Till:</td>
                    <td className="px-3 py-1.5 font-semibold">{format(new Date(data.valid_till), "dd/MM/yyyy")}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              onClick={() => window.print()}
              className="mt-3 no-print flex items-center gap-2 text-orange-600 border border-orange-300 rounded px-4 py-2 text-sm font-bold bg-orange-50 hover:bg-orange-100 ml-auto"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <table className="w-full border-collapse border border-gray-300 mb-2 text-[11px]">
          <thead>
            <tr className="bg-gray-100 text-gray-700 font-bold">
              <th className="border border-gray-300 px-2 py-2 text-center w-8">≡</th>
              <th className="border border-gray-300 px-2 py-2 text-left">▦ Description</th>
              <th className="border border-gray-300 px-2 py-2 text-center">◇ HSN</th>
              <th className="border border-gray-300 px-2 py-2 text-right">₹ Rate</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Qty</th>
              <th className="border border-gray-300 px-2 py-2 text-right">◼ Disc</th>
              <th className="border border-gray-300 px-2 py-2 text-right">◗ Amount</th>
              <th className="border border-gray-300 px-2 py-2 text-right">☑ CGST</th>
              <th className="border border-gray-300 px-2 py-2 text-right">☑ SGST</th>
              <th className="border border-gray-300 px-2 py-2 text-right">⊕ Total</th>
            </tr>
          </thead>
          <tbody>
            {enrichedItems.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                <td className="border border-gray-200 px-2 py-2.5 text-center text-gray-400">{idx + 1}</td>
                <td className="border border-gray-200 px-2 py-2.5">
                  <p className="font-semibold text-gray-900">[{item.item_code}] {item.name || item.item_code}</p>
                </td>
                <td className="border border-gray-200 px-2 py-2.5 text-center text-gray-600 font-mono text-[10px]">{item.hsn || "—"}</td>
                <td className="border border-gray-200 px-2 py-2.5 text-right font-mono">₹ {Number(item.rate).toFixed(6)}</td>
                <td className="border border-gray-200 px-2 py-2.5 text-center font-semibold">{item.qty.toFixed(2)}</td>
                <td className="border border-gray-200 px-2 py-2.5 text-right">{item.disc > 0 ? `₹ ${inr(item.disc)}` : "₹ 0.00"}</td>
                <td className="border border-gray-200 px-2 py-2.5 text-right font-semibold">₹ {inr(item.taxable)}</td>
                <td className="border border-gray-200 px-2 py-2.5 text-right">
                  <span>₹ {inr(item.cgst)}</span>
                  <br />
                  <span className="text-[9px] text-gray-400">({halfGst.toFixed(1)}%)</span>
                </td>
                <td className="border border-gray-200 px-2 py-2.5 text-right">
                  <span>₹ {inr(item.sgst)}</span>
                  <br />
                  <span className="text-[9px] text-gray-400">({halfGst.toFixed(1)}%)</span>
                </td>
                <td className="border border-gray-200 px-2 py-2.5 text-right font-bold">₹ {inr(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-sm font-bold text-gray-700 mb-4">
          Total: <span className="font-mono">{totalQty.toFixed(3)}</span>
        </p>

        {/* ── TAX SUMMARY + TOTALS ── */}
        <div className="flex gap-6 mb-4">
          {/* Left: Tax breakdown */}
          <div className="flex-1">
            <table className="border-collapse border border-gray-300 text-[11px] w-full max-w-xs">
              <thead>
                <tr className="bg-gray-100 font-bold text-gray-700">
                  <th className="border border-gray-300 px-3 py-1.5 text-left">≡ Item</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left">☑ Taxes</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-right">⊕ Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-3 py-1.5">1</td>
                  <td className="border border-gray-200 px-3 py-1.5">{halfGst}% CGST (Sale)</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-semibold">₹ {inr(calcCgst)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-3 py-1.5">2</td>
                  <td className="border border-gray-200 px-3 py-1.5">{halfGst}% SGST (Sale)</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-semibold">₹ {inr(calcSgst)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Summary */}
          <div className="w-72 shrink-0">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-bold text-gray-700">Subtotal</td>
                  <td className="py-1.5 text-right font-semibold">₹ {inr(calcSubtotal)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-bold text-gray-700">Taxes</td>
                  <td className="py-1.5 text-right font-semibold">₹ {inr(calcCgst + calcSgst)}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="py-2 font-black text-gray-900 text-base">Total</td>
                  <td className="py-2 text-right font-black text-gray-900 text-base">₹ {inr(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in words */}
        <p className="text-[11px] mb-6">
          <span className="font-bold">Amount in Words:</span>{" "}
          <span className="underline">{amountToWords(grandTotal)}</span>
        </p>

        {/* Page 1 footer */}
        <div className="border-t border-gray-300 pt-2 mt-auto">
          <p className="text-center text-[10px] text-gray-400">
            🏢 {companyName} &bull; {co?.phone || ""} &bull; {co?.email || ""}{cin ? ` • CIN: ${cin}` : ""}{co?.gstin ? ` • ${co.gstin}` : ""}
          </p>
        </div>
      </div>

      {/* ═══════════════ PAGE 2 ═══════════════ */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-[10mm] print:max-w-none page-break">
        {/* Repeat header */}
        <p className="text-center text-[11px] text-gray-500 mb-1 tracking-wide">
          TAX INVOICE (Original for Recipient)
        </p>
        <div className="flex justify-between items-start border-b-2 border-orange-500 pb-4 mb-5">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-orange-600 tracking-tight">{companyName}</h1>
            <p className="text-gray-600 whitespace-pre-wrap mt-1 text-[11px]">{co?.address || ""}</p>
          </div>
          <div className="text-right text-[11px] text-gray-700 shrink-0 ml-4">
            {co?.phone && <p>📞 {co.phone}</p>}
            {co?.email && <p>✉ {co.email}</p>}
            {co?.gstin && <p className="font-bold mt-1">GSTIN: {co.gstin}</p>}
          </div>
        </div>

        {/* Payment terms */}
        {co?.payment_terms && (
          <p className="text-[12px] font-semibold text-gray-700 mb-3 border-b pb-2 border-gray-200">
            Payment terms — {co.payment_terms}
          </p>
        )}

        {/* Bank Details */}
        <div className="mb-5">
          <h3 className="font-black text-gray-800 text-sm mb-2">Bank details:</h3>
          <div className="text-[12px] text-gray-700 space-y-0.5">
            {co?.company_name && <p>Account Name: {co.company_name}</p>}
            {co?.bank_name && <p>Bank Name: {co.bank_name}</p>}
            {co?.bank_account && <p>Account No: {co.bank_account}</p>}
            {co?.bank_ifsc && <p>IFSC: {co.bank_ifsc}</p>}
          </div>
        </div>

        {/* Delivery / policies */}
        {co?.delivery_time && <p className="text-[12px] text-gray-700 mb-2">Delivery time — {co.delivery_time}</p>}
        {co?.cancellation_policy && <p className="text-[12px] text-gray-700 mb-2">**{co.cancellation_policy}</p>}
        {co?.warranty_policy && (
          <div className="text-[12px] text-gray-700 mb-3">
            <p>Warranty — {co.warranty_policy}</p>
          </div>
        )}

        <p className="text-[12px] text-gray-700 mb-5">
          Whether tax is payable under reverse charge: <strong>No</strong>
        </p>

        {/* Terms & Conditions */}
        <div className="mb-8">
          <h3 className="font-black text-gray-800 text-sm mb-2">Terms & Conditions</h3>
          <ol className="list-decimal pl-5 text-[11px] text-gray-700 space-y-1.5">
            {(co?.terms || "Goods once sold will not be taken back.\nSubject to local jurisdiction.").split("\n").filter(Boolean).map((t: string, i: number) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>

        {/* Computer generated */}
        <div className="text-center text-[12px] font-bold text-gray-700 mt-12 mb-2">
          This is a computer generated Invoice.
        </div>
        {co?.jurisdiction && (
          <p className="text-center text-[12px] font-bold text-gray-600 mb-12">
            Subject to {co.jurisdiction} Jurisdiction
          </p>
        )}

        {/* Authorized signatory */}
        <div className="text-right mt-16 border-t border-gray-300 pt-2">
          <p className="text-[10px] text-gray-400 mb-8">Authorized Signatory</p>
          <p className="font-bold text-gray-800 text-sm">{companyName}</p>
        </div>

        {/* Page 2 footer */}
        <div className="border-t border-gray-300 pt-2 mt-8">
          <p className="text-center text-[10px] text-gray-400">
            🏢 {companyName} &bull; {co?.phone || ""} &bull; {co?.email || ""}{cin ? ` • CIN: ${cin}` : ""}{co?.gstin ? ` • ${co.gstin}` : ""}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 10mm; size: A4 portrait; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          .page-break { border-top: 2px dashed #ccc; margin-top: 2rem; }
        }
      `}</style>
    </div>
  );
}
