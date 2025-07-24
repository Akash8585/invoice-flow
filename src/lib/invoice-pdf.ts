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
  
  // Modern color palette - Black and White with subtle grays
  const primaryBlack = [0, 0, 0];
  const lightGray = [245, 245, 245];
  const mediumGray = [128, 128, 128];
  const darkGray = [64, 64, 64];
  
  // Company Header Section
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Company Name (use business profile if available)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const companyName = invoiceData.businessProfile?.businessName || 'INVOICEFLOW';
  doc.text(companyName, 20, 25);
  
  // Invoice title on the right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', 170, 25);
  
  // Business contact info in header (if available)
  if (invoiceData.businessProfile) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let headerY = 35;
    
    if (invoiceData.businessProfile.email) {
      doc.text(invoiceData.businessProfile.email, 20, headerY);
      headerY += 6;
    }
    
    if (invoiceData.businessProfile.phone) {
      doc.text(invoiceData.businessProfile.phone, 20, headerY);
    }
    
    // Business address on the right side of header
    if (invoiceData.businessProfile.address) {
      doc.setFontSize(8);
      const addressLines = doc.splitTextToSize(invoiceData.businessProfile.address, 80);
      doc.text(addressLines, 130, 35);
    }
  }
  
  // Reset text color to black
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  
  // Invoice Information Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details', 20, 70);
  
  // Invoice details box
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(1);
  doc.rect(20, 75, 85, 35);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 25, 85);
  doc.text(`Issue Date: ${new Date(invoiceData.billDate).toLocaleDateString()}`, 25, 92);
  if (invoiceData.dueDate) {
    doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 25, 99);
  }
  
  // Status badge
  const statusColor = invoiceData.status === 'paid' ? [34, 197, 94] : [239, 68, 68];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(25, 102, 25, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.status.toUpperCase(), 27, 106);
  
  // Reset text color
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  
  // Bill To Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', 120, 70);
  
  // Client details box
  doc.rect(120, 75, 70, 35);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.client.name, 125, 85);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let clientY = 92;
  
  if (invoiceData.client.email) {
    doc.text(invoiceData.client.email, 125, clientY);
    clientY += 6;
  }
  
  if (invoiceData.client.phone) {
    doc.text(invoiceData.client.phone, 125, clientY);
    clientY += 6;
  }
  
  if (invoiceData.client.address) {
    const addressLines = doc.splitTextToSize(invoiceData.client.address, 60);
    doc.text(addressLines, 125, clientY);
  }
  
  // Items Table
  const tableStartY = 130;
  
  // Table header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Items & Services', 20, tableStartY - 5);
  
  const tableData = invoiceData.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    item.quantity.toString(),
    `$${item.price.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);
  
  // Modern table design
  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      lineWidth: { bottom: 1 },
      lineColor: [200, 200, 200]
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      lineWidth: { bottom: 0.5 },
      lineColor: [230, 230, 230]
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 },
    styles: {
      lineColor: [230, 230, 230],
      lineWidth: 0.5
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252]
    }
  });
  
  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY + 20 || 200;
  
  // Summary Section
  const summaryStartX = 120;
  const summaryWidth = 70;
  
  // Summary box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(summaryStartX, finalY, summaryWidth, 45, 'F');
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.rect(summaryStartX, finalY, summaryWidth, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let summaryY = finalY + 10;
  
  // Subtotal
  doc.text('Subtotal:', summaryStartX + 5, summaryY);
  doc.text(`$${invoiceData.subtotal.toFixed(2)}`, summaryStartX + summaryWidth - 5, summaryY, { align: 'right' });
  
  // Extra charges
  if (invoiceData.extraChargesTotal > 0) {
    summaryY += 7;
    doc.text('Extra Charges:', summaryStartX + 5, summaryY);
    doc.text(`$${invoiceData.extraChargesTotal.toFixed(2)}`, summaryStartX + summaryWidth - 5, summaryY, { align: 'right' });
  }
  
  // Tax
  summaryY += 7;
  doc.text(`Tax (${invoiceData.taxRate}%):`, summaryStartX + 5, summaryY);
  doc.text(`$${invoiceData.tax.toFixed(2)}`, summaryStartX + summaryWidth - 5, summaryY, { align: 'right' });
  
  // Total line
  summaryY += 10;
  doc.setLineWidth(1);
  doc.line(summaryStartX + 5, summaryY - 3, summaryStartX + summaryWidth - 5, summaryY - 3);
  
  // Total amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', summaryStartX + 5, summaryY);
  doc.text(`$${invoiceData.total.toFixed(2)}`, summaryStartX + summaryWidth - 5, summaryY, { align: 'right' });
  
  // Notes Section
  if (invoiceData.notes) {
    const notesY = finalY + 55;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes & Terms:', 20, notesY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    
    const notesLines = doc.splitTextToSize(invoiceData.notes, 170);
    doc.text(notesLines, 20, notesY + 8);
  }
  
  // Footer
  const footerY = 270;
  
  // Footer line
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(2);
  doc.line(20, footerY, 190, footerY);
  
  // Footer text
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, footerY + 8, { align: 'center' });
  const footerCompany = invoiceData.businessProfile?.businessName || 'InvoiceFlow';
  doc.text(`Generated by ${footerCompany} - Professional Invoice Management System`, 105, footerY + 15, { align: 'center' });

  // Return the PDF as a Uint8Array/Buffer
  return doc.output('arraybuffer');
}; 