from pathlib import Path
from xml.sax.saxutils import escape, quoteattr
import xml.etree.ElementTree as ET

classes={
"User":(["id: String PK","email: String unique","password: String","name: String","role: UserRole","isActive: Boolean","createdAt: DateTime","updatedAt: DateTime"],["login(): boolean","logout(): void","requireRole(role): boolean"]),
"Session":(["id: String PK","userId: String FK","expiresAt: DateTime","token: String unique","createdAt: DateTime","updatedAt: DateTime","ipAddress: String?","userAgent: String?"],["isExpired(): boolean","invalidate(): void"]),
"Account":(["id: String PK","userId: String FK","accountId: String","providerId: String","accessToken: String?","refreshToken: String?","expiresAt: DateTime?","password: String?","createdAt: DateTime","updatedAt: DateTime"],["linkAccount(): Account","unlinkAccount(): void"]),
"Verification":(["id: String PK","identifier: String","value: String","expiresAt: DateTime","createdAt: DateTime?","updatedAt: DateTime?"],["verify(value): boolean","isExpired(): boolean"]),
"Table":(["id: String PK","tableNumber: Int unique","qrCode: String unique","isActive: Boolean","capacity: Int","createdAt: DateTime","updatedAt: DateTime"],["createTable(data): Table","updateTable(id, data): Table","deleteTable(id): void","generateQrCode(): String"]),
"Menu":(["id: String PK","name: String","description: String?","price: Int","category: MenuCategory","imageUrl: String?","isAvailable: Boolean","isActive: Boolean","highlightType: MenuHighlightType","createdAt: DateTime","updatedAt: DateTime"],["getMenus(): Menu[]","getMenuById(id): Menu","createMenu(data): Menu","updateMenu(id, data): Menu","deleteMenu(id): void","updateAvailability(id): Menu"]),
"MenuOption":(["id: String PK","menuId: String FK","name: String","isRequired: Boolean","createdAt: DateTime","updatedAt: DateTime"],["addValue(value): MenuOptionValue","updateOption(data): MenuOption","deleteOption(): void"]),
"MenuOptionValue":(["id: String PK","menuOptionId: String FK","label: String","priceAdjust: Int","createdAt: DateTime"],["calculateAdjustedPrice(basePrice): Int"]),
"Order":(["id: String PK","orderCode: String unique","accessToken: String unique","tableId: String FK","totalAmount: Int","status: OrderStatus","serviceType: OrderServiceType","priorityScore: Float","paymentStatus: PaymentStatus","paymentMethod: String?","paymentRedirectUrl: String? unique","paymentGatewayOrderId: String? unique","paidAt: DateTime?","paymentExpiresAt: DateTime?","createdAt: DateTime","updatedAt: DateTime"],["createOrder(data): Order","getOrders(): Order[]","getOrderByIdOrCode(id): Order","updateStatus(status): Order","cancelOrder(): Order","checkPaymentStatus(): PaymentStatus"]),
"OrderItem":(["id: String PK","orderId: String FK","menuId: String FK","quantity: Int","price: Int","notes: String?","createdAt: DateTime"],["calculateSubtotal(): Int","addSelectedOption(option): void"]),
"OrderItemOption":(["id: String PK","orderItemId: String FK","menuOptionValueId: String FK","optionName: String","optionValue: String","priceAdjust: Int","createdAt: DateTime"],["getPriceAdjust(): Int"]),
"DailyCashRecord":(["id: String PK","date: DateTime unique","amount: Int","notes: String?","recordedBy: String?","createdAt: DateTime","updatedAt: DateTime"],["getDailyEntry(date): DailyCashRecord","getRecentEntries(limit): DailyCashRecord[]","upsertDailyEntry(data): DailyCashRecord"]),
"OrderLog":(["id: String PK","orderId: String FK","status: String","message: String","createdBy: String?","createdAt: DateTime"],["createLog(orderId, status): OrderLog","getLogsByOrder(orderId): OrderLog[]"]),
}
enums={"UserRole":["OWNER","KITCHEN"],"MenuCategory":["FOOD","DRINK","SNACK","DESSERT"],"MenuHighlightType":["NONE","BEST_SELLER","RECOMMENDED","DELICIOUS"],"OrderStatus":["PENDING","PAID","PREPARING","READY","SERVED","CANCELLED"],"PaymentStatus":["PENDING","PAID","FAILED","EXPIRED"],"OrderServiceType":["DINE_IN","TAKEAWAY"]}
pos={"User":(40,60,270,300),"Session":(360,40,280,290),"Account":(360,370,290,320),"Verification":(40,420,270,230),"Table":(720,60,280,300),"Order":(1060,40,370,500),"OrderItem":(1490,90,310,280),"OrderItemOption":(1860,90,340,280),"OrderLog":(1060,590,320,250),"Menu":(720,430,310,430),"MenuOption":(1100,910,300,260),"MenuOptionValue":(1490,910,330,210),"DailyCashRecord":(40,720,330,290)}
epos={"UserRole":(40,1080,190,90),"MenuCategory":(270,1080,210,130),"MenuHighlightType":(520,1080,250,130),"OrderStatus":(820,1080,220,170),"PaymentStatus":(1080,1080,210,130),"OrderServiceType":(1330,1180,220,90)}
rels=[("User","Session","1","M","1 to Many"),("User","Account","1","M","1 to Many"),("Table","Order","1","M","1 to Many"),("Menu","MenuOption","1","M","1 to Many"),("MenuOption","MenuOptionValue","1","M","1 to Many"),("Order","OrderItem","1","M","1 to Many"),("Menu","OrderItem","1","M","1 to Many"),("OrderItem","OrderItemOption","1","M","1 to Many"),("MenuOptionValue","OrderItemOption","1","M","1 to Many"),("Order","OrderLog","1","M","1 to Many")]

def val(name,attrs,methods): return "<b>%s</b><hr>%s<hr>%s"%(escape(name),"<br>".join(escape('+ '+a) for a in attrs),"<br>".join(escape('+ '+m) for m in methods))
def evalv(name,vs): return "&lt;&lt;enumeration&gt;&gt;<br><b>%s</b><hr>%s"%(escape(name),"<br>".join(escape(v) for v in vs))

cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>']; ids={}; nid=2
def node(n,v,x,y,w,h,enum=False):
 global nid; cid=str(nid); nid+=1; ids[n]=cid
 fill="#dae8fc" if enum else "#fff2cc"; stroke="#6c8ebf" if enum else "#d6b656"
 style=f"rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=8;fillColor={fill};strokeColor={stroke};fontSize=12;"
 cells.append(f'<mxCell id="{cid}" value={quoteattr(v)} style={quoteattr(style)} vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
for n,(a,m) in classes.items(): node(n,val(n,a,m),*pos[n])
for n,vs in enums.items(): node(n,evalv(n,vs),*epos[n],enum=True)
for s,d,sl,dl,mid in rels:
 cid=str(nid); nid+=1; style="endArrow=none;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;strokeWidth=1.5;"
 cells.append(f'<mxCell id="{cid}" value={quoteattr(mid)} style={quoteattr(style)} edge="1" parent="1" source="{ids[s]}" target="{ids[d]}"><mxGeometry relative="1" as="geometry"/></mxCell>')
 for x,t in [(-0.85,sl),(0.85,dl)]:
  lid=str(nid); nid+=1; st="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];fontSize=12;fontStyle=1"
  cells.append(f'<mxCell id="{lid}" value={quoteattr(t)} style={quoteattr(st)} vertex="1" connectable="0" parent="{cid}"><mxGeometry x="{x}" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>')
xml='<mxfile host="app.diagrams.net" modified="2026-06-23T00:00:00.000Z" agent="pi" version="26.0.0" type="device"><diagram id="cafe-gonku-class-diagram" name="Cafe Gonku Class Diagram"><mxGraphModel dx="2300" dy="1350" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2300" pageHeight="1350" math="0" shadow="0"><root>'+"\n".join(cells)+'</root></mxGraphModel></diagram></mxfile>'
Path('docs/class-diagram.drawio').write_text(xml,encoding='utf-8')
ET.parse('docs/class-diagram.drawio')
print('wrote docs/class-diagram.drawio valid xml')
