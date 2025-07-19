import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
}

export const generateInvoicePDF = (invoiceData: InvoiceData) => {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Colors - using black and white for minimalist design
  const textColor = [0, 0, 0]; // Black
  const statusColor = invoiceData.status === 'paid' ? [34, 197, 94] : [239, 68, 68]; // Green for paid, red for due
  
  // Header - Centered "INVOICE" title
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 105, 25, { align: 'center' });
  
  // Line after title
  doc.line(20, 35, 190, 35);
  
  // Invoice details on the left
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 20, 50);
  doc.text(`Date: ${new Date(invoiceData.billDate).toLocaleDateString()}`, 20, 57);
  doc.text(`Status: ${invoiceData.status.toUpperCase()}`, 20, 64);
  
  // Line after invoice details
  doc.line(20, 75, 190, 75);
  
  // Bill To section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 90);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${invoiceData.client.name}`, 20, 100);
  
  if (invoiceData.client.email) {
    doc.text(`Email: ${invoiceData.client.email}`, 20, 107);
  }
  
  if (invoiceData.client.phone) {
    doc.text(`Phone: ${invoiceData.client.phone}`, 20, 114);
  }
  
  if (invoiceData.client.address) {
    doc.text(`Address: ${invoiceData.client.address}`, 20, 121);
  }
  
  // Line after Bill To section
  doc.line(20, 130, 190, 130);
  
  // Items table
  const tableData = invoiceData.items.map(item => [
    item.name,
    item.quantity.toString(),
    `$${item.price.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);
  
  // Add table using autoTable with clean design
  autoTable(doc, {
    startY: 140,
    head: [['Item', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      lineWidth: 1
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 20, right: 20 },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  });
  
  // Get the Y position after the table
  const finalY = (doc as any).lastAutoTable?.finalY + 10 || 200;
  
  // Line after table
  doc.line(20, finalY, 190, finalY);
  
  // Summary section - right aligned
  const summaryX = 120;
  const summaryY = finalY + 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(`$${invoiceData.subtotal.toFixed(2)}`, summaryX + 50, summaryY);
  
  // Extra charges
  if (invoiceData.extraChargesTotal > 0) {
    doc.text('Extra Charges:', summaryX, summaryY + 8);
    doc.text(`$${invoiceData.extraChargesTotal.toFixed(2)}`, summaryX + 50, summaryY + 8);
  }
  
  // Tax
  doc.text(`Tax (${invoiceData.taxRate}%):`, summaryX, summaryY + 16);
  doc.text(`$${invoiceData.tax.toFixed(2)}`, summaryX + 50, summaryY + 16);
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', summaryX, summaryY + 30);
  doc.text(`$${invoiceData.total.toFixed(2)}`, summaryX + 50, summaryY + 30);
  
  // Notes section
  if (invoiceData.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 20, summaryY + 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Split notes into multiple lines if too long
    const words = invoiceData.notes.split(' ');
    let line = '';
    let yPos = summaryY + 58;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      if (doc.getTextWidth(testLine) > 150) {
        doc.text(line, 20, yPos);
        line = word + ' ';
        yPos += 5;
      } else {
        line = testLine;
      }
    }
    doc.text(line, 20, yPos);
  }
  
  // Line before footer
  const footerY = 270;
  doc.line(20, footerY - 10, 190, footerY - 10);
  
  // Footer - centered text
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, footerY, { align: 'center' });
  doc.text('Generated via InvoiceFlow - Professional Invoice Management', 105, footerY + 8, { align: 'center' });

  // Return the PDF as a Uint8Array/Buffer
  return doc.output('arraybuffer');
}; 