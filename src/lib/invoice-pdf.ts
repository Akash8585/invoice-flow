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
  
  // Clean color palette
  const black = [0, 0, 0];
  const gray = [128, 128, 128];
  const lightGray = [240, 240, 240];
  const green = [34, 197, 94];
  
  // Business name at top left
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'normal');
  const businessName = invoiceData.businessProfile?.businessName || 'HEALTHY FOOD';
  doc.text(businessName, 20, 30);
  
  // Invoice number and date at top right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No ${invoiceData.invoiceNumber}`, 210 - 20, 30, { align: 'right' });
  doc.text(new Date(invoiceData.billDate).toLocaleDateString('en-GB'), 210 - 20, 45, { align: 'right' });
  
  // Business contact info under business name
  doc.setFontSize(10);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  let contactY = 45;
  
  if (invoiceData.businessProfile?.email) {
    doc.text(invoiceData.businessProfile.email, 20, contactY);
    contactY += 12;
  }
  
  if (invoiceData.businessProfile?.phone) {
    doc.text(invoiceData.businessProfile.phone, 20, contactY);
  }
  
  // "billed to:" label
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('billed to:', 20, 90);
  
  // Client information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  let clientY = 110;
  
  // Client name
  doc.text(invoiceData.client.name, 20, clientY);
  clientY += 15;
  
  // Client address (if available)
  if (invoiceData.client.address) {
    doc.setFontSize(11);
    const addressLines = doc.splitTextToSize(invoiceData.client.address, 100);
    doc.text(addressLines, 20, clientY);
    clientY += addressLines.length * 12;
  }
  
  // Client phone (if available)
  if (invoiceData.client.phone) {
    doc.setFontSize(11);
    doc.text(invoiceData.client.phone, 20, clientY);
  }
  
  // Items table
  const tableStartY = 180;
  
  // Prepare table data
  const tableData = invoiceData.items.map((item) => [
    item.name,
    `${item.quantity}`,
    `$ ${item.price.toFixed(0)}`,
    `$ ${item.total.toFixed(0)}`
  ]);
  
  // Create clean table
  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Quantity', 'Price', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      fontSize: 11,
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 11,
      textColor: [0, 0, 0],
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 20, right: 20 },
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  });
  
  // Get table end position
  const tableEndY = (doc as any).lastAutoTable?.finalY + 20 || 240;
  
  // Extra charges (if any)
  let summaryY = tableEndY;
  
  if (invoiceData.extraChargesTotal > 0) {
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('delivery Charges', 20, summaryY);
    doc.text(`$ ${invoiceData.extraChargesTotal.toFixed(0)}`, 170, summaryY, { align: 'right' });
    summaryY += 20;
  }
  
  // Grand Total
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('Grand Total:', 20, summaryY);
  
  // Total amount in green
  doc.setTextColor(green[0], green[1], green[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`$ ${invoiceData.total.toFixed(2)}`, 170, summaryY, { align: 'right' });
  
  // Footer with contact info
  const footerY = 260;
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Phone icon and number
  if (invoiceData.businessProfile?.phone) {
    doc.text(`📞 ${invoiceData.businessProfile.phone}`, 20, footerY);
  }
  
  // Email icon and address
  if (invoiceData.businessProfile?.email) {
    doc.text(`✉ ${invoiceData.businessProfile.email}`, 20, footerY + 12);
  }
  
  // Signature area
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.text('Signature', 150, footerY + 6);
  
  // Signature line
  doc.setDrawColor(gray[0], gray[1], gray[2]);
  doc.setLineWidth(0.5);
  doc.line(130, footerY + 15, 180, footerY + 15);

  // Return the PDF as a Uint8Array/Buffer
  return doc.output('arraybuffer');
}; 