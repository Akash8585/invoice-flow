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
  
  // Color palette
  const black = [0, 0, 0];
  const gray = [128, 128, 128];
  const lightGray = [245, 245, 245];
  const green = [34, 197, 94];
  const blue = [59, 130, 246];
  
  // Header section with business info
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const businessName = invoiceData.businessProfile?.businessName || 'Your Business Name';
  doc.text(businessName, 20, 25);
  
  // Business contact info under business name
  doc.setFontSize(10);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFont('helvetica', 'normal');
  let businessY = 35;
  
  if (invoiceData.businessProfile?.email) {
    doc.text(invoiceData.businessProfile.email, 20, businessY);
    businessY += 12;
  }
  
  if (invoiceData.businessProfile?.phone) {
    doc.text(invoiceData.businessProfile.phone, 20, businessY);
    businessY += 12;
  }
  
  if (invoiceData.businessProfile?.address) {
    const addressLines = doc.splitTextToSize(invoiceData.businessProfile.address, 80);
    doc.text(addressLines, 20, businessY);
  }
  
  // Invoice header
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #${invoiceData.invoiceNumber}`, 20, 80);
  
  // Status badge
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Status:', 160, 80);
  
  // Status with colored background
  const statusColor = invoiceData.status === 'paid' ? green : blue;
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(185, 75, 20, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.status.charAt(0).toUpperCase() + invoiceData.status.slice(1), 187, 80);
  
  // Reset text color
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Created and Last updated dates
  const currentDate = new Date().toLocaleDateString('en-GB');
  doc.text(`Created on ${new Date(invoiceData.billDate).toLocaleDateString('en-GB')}`, 20, 95);
  doc.text(`Last updated: ${currentDate}`, 130, 95);
  
  // Bill To section
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 115);
  
  // Invoice Date and Total on right
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice Date:', 130, 115);
  doc.text('Total:', 130, 135);
  
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(invoiceData.billDate).toLocaleDateString('en-GB'), 175, 115);
  doc.setFontSize(18);
  doc.text(`$${invoiceData.total.toFixed(2)}`, 175, 135);
  
  // Client information
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.client.name, 20, 130);
  
  doc.setFontSize(11);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFont('helvetica', 'normal');
  let clientY = 145;
  
  if (invoiceData.client.email) {
    doc.text(invoiceData.client.email, 20, clientY);
    clientY += 12;
  }
  
  if (invoiceData.client.phone) {
    doc.text(invoiceData.client.phone, 20, clientY);
    clientY += 12;
  }
  
  if (invoiceData.client.address) {
    const addressLines = doc.splitTextToSize(invoiceData.client.address, 100);
    doc.text(addressLines, 20, clientY);
  }
  
  // Items section
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Items', 20, 190);
  
  // Items table
  const tableStartY = 205;
  
  const tableData = invoiceData.items.map((item) => [
    item.name,
    item.quantity.toFixed(2),
    `$${item.price.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [248, 249, 250],
      textColor: [75, 85, 99],
      fontStyle: 'bold',
      fontSize: 11,
      cellPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      lineWidth: { bottom: 1 },
      lineColor: [229, 231, 235]
    },
    bodyStyles: {
      fontSize: 11,
      textColor: [0, 0, 0],
      cellPadding: { top: 12, right: 10, bottom: 12, left: 10 },
      lineWidth: { bottom: 0.5 },
      lineColor: [243, 244, 246]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 },
    styles: {
      lineColor: [243, 244, 246],
      lineWidth: 0.5
    }
  });
  
  // Summary section
  const summaryStartY = (doc as any).lastAutoTable?.finalY + 20 || 260;
  
  // Right-aligned summary
  const summaryX = 130;
  doc.setFontSize(12);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFont('helvetica', 'normal');
  
  let summaryY = summaryStartY;
  
  // Subtotal
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(`$${invoiceData.subtotal.toFixed(2)}`, 180, summaryY, { align: 'right' });
  summaryY += 15;
  
  // Tax
  doc.text(`Tax (${invoiceData.taxRate}%):`, summaryX, summaryY);
  doc.text(`$${invoiceData.tax.toFixed(2)}`, 180, summaryY, { align: 'right' });
  summaryY += 20;
  
  // Total
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', summaryX, summaryY);
  doc.text(`$${invoiceData.total.toFixed(2)}`, 180, summaryY, { align: 'right' });
  
  // Footer with business info
  if (invoiceData.businessProfile) {
    const footerY = 280;
    doc.setFontSize(9);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFont('helvetica', 'normal');
    
    let footerText = '';
    if (invoiceData.businessProfile.businessName) {
      footerText += invoiceData.businessProfile.businessName;
    }
    if (invoiceData.businessProfile.email) {
      footerText += ` • ${invoiceData.businessProfile.email}`;
    }
    if (invoiceData.businessProfile.phone) {
      footerText += ` • ${invoiceData.businessProfile.phone}`;
    }
    
    doc.text(footerText, 105, footerY, { align: 'center' });
    
    if (invoiceData.businessProfile.address) {
      doc.text(invoiceData.businessProfile.address, 105, footerY + 10, { align: 'center' });
    }
  }

  return doc.output('arraybuffer');
}; 