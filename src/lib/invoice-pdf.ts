import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface BusinessProfile {
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  billDate: string;
  dueDate?: string;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  tax: number;
  extraChargesTotal: number;
  total: number;
  notes?: string;
  status: string;
  businessProfile?: BusinessProfile;
}

export const generateInvoicePDF = (invoiceData: InvoiceData) => {
  const doc = new jsPDF();
  const black: [number, number, number] = [17, 24, 39];
  const gray: [number, number, number] = [107, 114, 128];
  const lightGray: [number, number, number] = [243, 244, 246];

  const cursorY = 20;

  // Logo (optional)
  if (invoiceData.businessProfile?.logo) {
    try {
      doc.addImage(invoiceData.businessProfile.logo, 'PNG', 160, cursorY, 30, 30);
    } catch (error) {
      console.warn('Failed to add logo to PDF:', error);
      // Continue without logo if there's an error
    }
  }

  // Business Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(invoiceData.businessProfile?.businessName || 'Your Business Name', 20, cursorY + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray[0], gray[1], gray[2]);
  let businessLinesY = cursorY + 15;

  const businessInfo = [
    invoiceData.businessProfile?.email,
    invoiceData.businessProfile?.phone,
    invoiceData.businessProfile?.address,
  ].filter(Boolean);

  businessInfo.forEach((line) => {
    const lines = doc.splitTextToSize(line!, 80);
    doc.text(lines, 20, businessLinesY);
    businessLinesY += lines.length * 6;
  });

  // Invoice Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(`Invoice`, 20, businessLinesY + 15);

  // Invoice Info (right side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rightY = businessLinesY + 15;
  doc.setTextColor(gray[0], gray[1], gray[2]);

  const info = [
    [`Invoice #:`, invoiceData.invoiceNumber],
    [`Invoice Date:`, new Date(invoiceData.billDate).toLocaleDateString('en-GB')],
    [`Due Date:`, invoiceData.dueDate || '—'],
    [`Status:`, invoiceData.status.toUpperCase()],
  ];

  info.forEach(([label, value], index) => {
    doc.text(label, 145, rightY + index * 7);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(value.toString(), 170, rightY + index * 7);
    doc.setTextColor(gray[0], gray[1], gray[2]);
  });

  // "Bill To" Section
  const billToY = rightY + info.length * 7 + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('Bill To:', 20, billToY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray[0], gray[1], gray[2]);
  const client = invoiceData.client;
  let clientY = billToY + 6;
  doc.text(client.name, 20, clientY); clientY += 6;
  if (client.email) { doc.text(client.email, 20, clientY); clientY += 6; }
  if (client.phone) { doc.text(client.phone, 20, clientY); clientY += 6; }
  if (client.address) {
    const addrLines = doc.splitTextToSize(client.address, 90);
    doc.text(addrLines, 20, clientY);
    clientY += addrLines.length * 6;
  }

  // Items Table
  const tableY = clientY + 10;
  const tableData = invoiceData.items.map((item) => [
    item.name,
    item.quantity.toFixed(2),
    `₹${item.price.toFixed(2)}`,
    `₹${item.total.toFixed(2)}`
  ]);

  try {
    autoTable(doc, {
      startY: tableY,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      margin: { left: 20, right: 20 },
      theme: 'grid',
      headStyles: {
        fillColor: lightGray,
        textColor: black,
        fontStyle: 'bold',
      },
      styles: {
        font: 'helvetica',
        fontSize: 10,
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });
  } catch (error) {
    console.error('Failed to generate table:', error);
    // Fallback: simple text-based table
    doc.setFontSize(10);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('Items:', 20, tableY);
    let itemY = tableY + 10;
    invoiceData.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.name} - Qty: ${item.quantity} - Price: ₹${item.price.toFixed(2)} - Total: ₹${item.total.toFixed(2)}`, 20, itemY);
      itemY += 8;
    });
  }

  // Summary
  const summaryY = (doc as any).lastAutoTable.finalY + 10;
  const summaryX = 120;
  doc.setFontSize(10);
  doc.setTextColor(gray[0], gray[1], gray[2]);

  const summary = [
    ['Subtotal', `₹${invoiceData.subtotal.toFixed(2)}`],
    [`Tax (${invoiceData.taxRate}%)`, `₹${invoiceData.tax.toFixed(2)}`],
    invoiceData.extraChargesTotal > 0 ? ['Other Charges', `₹${invoiceData.extraChargesTotal.toFixed(2)}`] : null,
    ['Total', `₹${invoiceData.total.toFixed(2)}`]
  ].filter(Boolean) as [string, string][];

  summary.forEach(([label, value], idx) => {
    doc.text(label, summaryX, summaryY + idx * 8);
    doc.text(value, 190, summaryY + idx * 8, { align: 'right' });
  });

  // Notes
  if (invoiceData.notes) {
    const notesY = summaryY + summary.length * 8 + 15;
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 20, notesY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    const noteLines = doc.splitTextToSize(invoiceData.notes, 170);
    doc.setFillColor(248, 250, 252);
    doc.rect(20, notesY + 4, 170, noteLines.length * 6 + 4, 'F');
    doc.text(noteLines, 24, notesY + 10);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  const footerText = [
    invoiceData.businessProfile?.businessName,
    invoiceData.businessProfile?.email,
    invoiceData.businessProfile?.phone
  ].filter(Boolean).join(' • ');
  doc.text(footerText, 105, 290, { align: 'center' });

  return doc.output('arraybuffer');
};