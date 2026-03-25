import { useParams } from "react-router-dom";
import { salesApi, api, purchasingApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState } from "@/components/LoadingState";
import { format } from "date-fns";
import { Printer } from "lucide-react";

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
  const { data: co } = useApiQuery(["settings", "company"], () => api.get<any>("/api/settings/company"));

  if (isLoading) return <LoadingState message={`Loading ${type || 'invoice'}...`} />;
  if (error || !data) return <ErrorState message={`Could not load ${type || 'invoice'}.`} />;

  const customer_name = data.customer_name || data.vendor_name || data.supplier_name || data.customer || data.vendor || data.supplier;
  const customer_address = data.customer_address || data.vendor_address || data.supplier_address || "";
  const customer_contact = data.customer_contact || data.vendor_contact || "";
  const customer_gst = data.customer_gst || data.vendor_gst || "";
  
  const { date, amount, grand_total, custom_data, items = [] } = data;
  const discount_total = Number(custom_data?.discount || 0);
  const gst_rate = Number(custom_data?.gst_rate || 0);
  const hasGst = gst_rate > 0;
  const taxable = Number(custom_data?.taxable ?? (Number(amount || 0) - discount_total));
  const cgst = hasGst ? Number(custom_data?.cgst || 0) : 0;
  const sgst = hasGst ? Number(custom_data?.sgst || 0) : 0;

  // Per-item discount is distributed proportionally from total discount
  const subtotal = Number(amount || 0);
  const discountFraction = subtotal > 0 ? discount_total / subtotal : 0;

  return (
    <div className="bg-white min-h-screen text-black p-8 max-w-[22cm] mx-auto font-sans text-[12.5px] leading-relaxed print:p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{(co?.company_name || "MY COMPANY").toUpperCase()}</h1>
          <p className="text-slate-500 mt-1 whitespace-pre-wrap">{co?.address || ""}</p>
          {co?.gstin && <p className="text-slate-500">GSTIN: <span className="font-semibold text-slate-700">{co.gstin}</span></p>}
          {(co?.email || co?.phone) && <p className="text-slate-500">{[co?.email, co?.phone].filter(Boolean).join(" | ")}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-slate-700 uppercase tracking-widest mb-3">{isQuote ? "Quotation" : "Tax Invoice"}</h2>
          <table className="text-sm ml-auto border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1 font-bold text-slate-700 bg-slate-50">{isQuote ? "Quotation No" : "Invoice No"}</td>
                <td className="px-3 py-1 font-medium">{data.id}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1 font-bold text-slate-700 bg-slate-50">Date</td>
                <td className="px-3 py-1 font-medium">{format(new Date(date), "dd/MM/yyyy")}</td>
              </tr>
              {isQuote && data.valid_till && (
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1 font-bold text-slate-700 bg-slate-50">Valid Till</td>
                  <td className="px-3 py-1 font-medium">{format(new Date(data.valid_till), "dd/MM/yyyy")}</td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-1 font-bold text-slate-700 bg-slate-50">Status</td>
                <td className="px-3 py-1 font-medium uppercase">{data.status}</td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => window.print()} className="mt-3 no-print flex items-center gap-2 text-blue-600 border border-blue-300 rounded px-3 py-1.5 text-sm font-semibold ml-auto bg-blue-50 hover:bg-blue-100">
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-700 px-3 py-1 inline-block rounded-t">Billed To</p>
        <div className="border border-slate-300 p-4 rounded-b rounded-tr bg-slate-50/50 min-h-[80px]">
          <p className="text-base font-black text-slate-900">{customer_name}</p>
          {customer_address && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{customer_address}</p>}
          {customer_contact && <p className="text-slate-600 mt-1">Contact: {customer_contact}</p>}
          {customer_gst && <p className="font-bold text-slate-800 mt-2">GSTIN: {customer_gst}</p>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border border-slate-300 mb-6 text-[12px]">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-600 px-2 py-2 text-left w-8">#</th>
            <th className="border border-slate-600 px-2 py-2 text-left">Description</th>
            <th className="border border-slate-600 px-2 py-2 text-center">HSN</th>
            <th className="border border-slate-600 px-2 py-2 text-right">Rate (₹)</th>
            <th className="border border-slate-600 px-2 py-2 text-center">Qty</th>
            <th className="border border-slate-600 px-2 py-2 text-right">Disc (₹)</th>
            <th className="border border-slate-600 px-2 py-2 text-right">Amount (₹)</th>
            {hasGst && <th className="border border-slate-600 px-2 py-2 text-right">CGST ({gst_rate/2}%)</th>}
            {hasGst && <th className="border border-slate-600 px-2 py-2 text-right">SGST ({gst_rate/2}%)</th>}
            <th className="border border-slate-600 px-2 py-2 text-right">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const itemAmount = Number(item.qty) * Number(item.rate);
            const itemDiscPct = Number(item.disc_pct || 0);
            const itemDisc = itemDiscPct > 0 ? parseFloat((itemAmount * itemDiscPct / 100).toFixed(2)) : parseFloat((itemAmount * discountFraction).toFixed(2));
            const itemTaxable = itemAmount - itemDisc;
            const itemCgst = hasGst ? parseFloat((itemTaxable * (gst_rate / 2) / 100).toFixed(2)) : 0;
            const itemSgst = itemCgst;
            const itemTotal = itemTaxable + itemCgst + itemSgst;
            return (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="border border-slate-200 px-2 py-2 text-center text-slate-500">{idx + 1}</td>
                <td className="border border-slate-200 px-2 py-2">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">SKU: {item.item_code}</p>
                </td>
                <td className="border border-slate-200 px-2 py-2 text-center text-slate-600">8536</td>
                <td className="border border-slate-200 px-2 py-2 text-right">{Number(item.rate).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td className="border border-slate-200 px-2 py-2 text-center font-semibold">{item.qty}</td>
                <td className="border border-slate-200 px-2 py-2 text-right text-red-700">{itemDisc > 0 ? itemDisc.toLocaleString('en-IN', {minimumFractionDigits:2}) : "—"}</td>
                <td className="border border-slate-200 px-2 py-2 text-right font-semibold">{itemTaxable.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                {hasGst && <td className="border border-slate-200 px-2 py-2 text-right">{itemCgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>}
                {hasGst && <td className="border border-slate-200 px-2 py-2 text-right">{itemSgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>}
                <td className="border border-slate-200 px-2 py-2 text-right font-bold text-slate-900">{itemTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold text-slate-800">
            <td className="border border-slate-300 px-2 py-2 text-right" colSpan={6}>Subtotals</td>
            <td className="border border-slate-300 px-2 py-2 text-right">{taxable.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            {hasGst && <td className="border border-slate-300 px-2 py-2 text-right">{cgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>}
            {hasGst && <td className="border border-slate-300 px-2 py-2 text-right">{sgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>}
            <td className="border border-slate-300 px-2 py-2 text-right">₹{Number(grand_total).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        </tfoot>
      </table>

      {/* Footer Row */}
      <div className="flex justify-between items-start gap-8">
        <div className="flex-1">
          <div className="border border-slate-300 rounded p-4 bg-slate-50 text-[11px] mb-4">
            <h4 className="font-black text-slate-800 mb-2 uppercase tracking-wide border-b pb-1">Bank Details</h4>
            {co?.bank_name && <p><span className="font-semibold">Bank:</span> {co.bank_name}</p>}
            {co?.company_name && <p><span className="font-semibold">A/C Name:</span> {co.company_name}</p>}
            {co?.bank_account && <p><span className="font-semibold">A/C No:</span> {co.bank_account}</p>}
            {co?.bank_ifsc && <p><span className="font-semibold">IFSC:</span> {co.bank_ifsc}{co?.bank_branch ? ` | Branch: ${co.bank_branch}` : ""}</p>}
          </div>
          <div className="text-[11px] text-slate-500">
            <h4 className="font-bold text-slate-700 mb-1">Terms & Conditions</h4>
            <ul className="list-disc pl-4 space-y-0.5">
              {(co?.terms || "").split("\n").filter(Boolean).map((t: string, i: number) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>

        <div className="w-80 shrink-0">
          <div className="border border-slate-300 rounded overflow-hidden text-[13px]">
            <div className="flex justify-between px-4 py-2 border-b border-slate-200">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold">₹{subtotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            </div>
            {discount_total > 0 && (
              <div className="flex justify-between px-4 py-2 border-b border-slate-200 bg-red-50 text-red-700">
                <span>Discount</span>
                <span className="font-bold">- ₹{discount_total.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
              </div>
            )}
            {hasGst && (
              <>
                <div className="flex justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Taxable Value</span>
                  <span className="font-bold">₹{taxable.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-slate-200 text-slate-600">
                  <span>CGST @ {gst_rate/2}%</span>
                  <span className="font-medium">+ ₹{cgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-slate-200 text-slate-600">
                  <span>SGST @ {gst_rate/2}%</span>
                  <span className="font-medium">+ ₹{sgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              </>
            )}
            <div className="flex justify-between px-4 py-3 bg-slate-800 text-white font-black text-base">
              <span>Grand Total</span>
              <span>₹{Number(grand_total).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            </div>
          </div>

          <div className="text-right mt-12 border-t border-slate-300 pt-2">
            <p className="text-xs text-slate-400 mb-10">Authorized Signatory</p>
            <p className="font-bold text-slate-800 text-sm">{co?.company_name || "My Company"}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 10mm; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
}
