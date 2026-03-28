<div class="joplin-table-wrapper"><table><tbody><tr><td><h1>SOPs for Software Development Department</h1></td></tr></tbody></table></div>

Table of Contents

[**1.** **Action** - 4 -](#_Toc150340035)

[**2.** **Active / InActive** - 4 -](#_Toc150340036)

[**3.** **Symbols data** - 4 -](#_Toc150340037)

[**4.** **Numeric Data** - 5 -](#_Toc150340038)

[**5.** **Text Data** - 5 -](#_Toc150340039)

[**6.** **Ascending/Descending Sorting** - 5 -](#_Toc150340040)

[**7.** **Reports Searching Fields** - 6 -](#_Toc150340041)

[**8.** **Add** - 7 -](#_Toc150340042)

[**9.** **Edit** - 8 -](#_Toc150340043)

[**10.** **Numeric Prices** - 8 -](#_Toc150340044)

[**11.** **Time Stamp** - 8 -](#_Toc150340045)

[**12.** **Reports Changing Methodology** - 8 -](#_Toc150340046)

[**13.** **Font Size & Color** - 8 -](#_Toc150340047)

[**14.** **Line Spacing** - 8 -](#_Toc150340048)

[**15.** **Scrolling Button** - 8 -](#_Toc150340049)

[**16.** **Tabs/Heading Selection** - 8 -](#_Toc150340050)

[**17.** **No/0 Data Printing** - 8 -](#_Toc150340051)

[**18.** **Browser Compatibility** - 9 -](#_Toc150340052)

[**19.** **Pages Responsiveness** - 9 -](#_Toc150340053)

[**20.** **Ascending Order** - 9 -](#_Toc150340054)

[**21.** **Medicines/ Data Input Layout, Order** - 9 -](#_Toc150340055)

[**22.** **Input Field focus/ Highlight, movement of cursor via Tab Button** - 9 -](#_Toc150340056)

[**23.** **Enter Button Functionality** - 9 -](#_Toc150340057)

[**24.** **Autofocus** - 10 -](#_Toc150340058)

[**25.** **Double/Multiple Click Checking** \- 11 -](#_Toc150340059)

[**26.** **Report** - 11 -](#_Toc150340060)

[**27.** **Non Implemented Configuration** - 11 -](#_Toc150340061)

[**28.** **Replace “Challan” to “Receipt”** - 13 -](#_Toc150340062)

[**29.** **Presentation of State and Province** - 13 -](#_Toc150340063)

[**31.** **Date Format** - 14 -](#_Toc150340065)

[**32.** **Spacing of Data Table** - 14 -](#_Toc150340066)

1.  **Action**

All Buttons in “Action” Column of Data Table should be **_Centrally Aligned_**

1.  **Active / InActive**

All “Active / InActive” heading in DataTable Columns should be Replaced with “Status” and **_Centrally Align_** in all direction (up / down, right / left), e.g.

1.  **Symbols data**

The Data in Columns of DataTable that contain “Symbols data” should be **_Centrally Aligned_** in all direction (up / down, right / left), e.g:

1.  **Numeric Data**

The data in Columns of DataTable that contain “Numeric Data” should be **_Centrally Aligned_** (up / down, right / left), e.g:

1.  **Text Data**

The Data in Columns of DataTable that contain “Text Data” should be **_Left Aligned_**

1.  **Ascending/Descending Sorting**

All **_DataTable Columns_** should contain Ascending/Descending Sorting

- 1.  Ascending Sorting

- 1.  Descending Sorting

1.  **Reports Searching Fields**

All DataTables columns that **contain CNIC and MR**. It should be allowed searching for both CNIC, MR No, Visit No, Admission No, Lab and Procedure No.

- 1.  **MR. No**

- 1.  **CNIC No**

- 1.  **MR, CNIC, Lab, Procedure No (Visit No, Admission No where required)**

1.  **Add**

All pages Add New content should contain “**Add**” with module in Heading

All Page role and Page Information should be added while creating / after QA Approval before GO Live. It should be added accordingly

1.  **Edit**

All pages Edit content should contain “Edit” with module in Heading

1.  **Numeric Prices**

All pages containing “Numeric Prices” should be separated by comas with 2 decimal points also all columns containing Amount/Prices should be Right Align with 3 digits,(000,000,000.00) separated

1.  **Time Stamp**
2.  Modified On, Created On
3.  Modified by, Created by
4.  Time Stamp locking (Server side)
5.  **Reports Changing Methodology**

No changing in reports specially from administrator point of view and diff type of statuses of view links like signature, date and time, name, dr, etc and clinical parameters not more than 1 month, except diagnostic, investigation, procedures, no change in report from 24Hrs onwards.

1.  **Font Size & Color**

Font Size in Bold 13 and normal 12, color should be Black.

1.  **Line Spacing**

Spacing should be 1 or 1.15 Size between two lines in whole system.

1.  **Scrolling Button**

Scrolling button should be Left Bottom in whole system.

1.  **Tabs/Heading Selection**

Selected Tabs in Header should be **BOLD and Highlighted,** **horizontal scroll if tab more then one page (all tabs should be in one line in horizontally).**

1.  **No/0 Data Printing**

No or 0 data input fields/ columns etc. **Should Not** be showing in the Print.

1.  **Browser Compatibility**

Compatibility for all Browsers (Chrome, Microsoft Edge, Safari, Firefox).

1.  **Pages Responsiveness**

There should be responsiveness of pages, (layout design).

1.  **Ascending Order**

New Edit/ Updated data in data table modified by ascending order.

1.  **Medicines/ Data Input Layout, Order**

Medicines layout/ priority should be the same as/ when order in eRx/ Pharmacy/ Challan/ anywhere showing as output, (same for the all ordered services) and same order of the data input fields of services/test in report also.

1.  **Input Field focus/ Highlight, movement of cursor via Tab Button**

There should be input data field focus, highlighted and cursor should also move with Tab Button (Key Board).

1.  **Enter Button Functionality**

**Enter** button should be working on every **Search field, Submit** button and **Update** Button after focusing with tab button also.

1.  **Autofocus**

**First element** of the form should be **autofocused** on the page load and reload.

1.  **Double/Multiple Click Checking**

Verify all the button (Submit, Update, Edit etc.) by adding **$('#SubmitId').click()** this id multiple time in Inspect Element for double click checking.

  

1.  **Report**

Header and Footer Data should be **_Centrally Aligned_** (up / down, right / left), e.g:

  

1.  **Non Implemented Configuration**

Non implemented configurations should not show up anywhere in the software. 

1.  **Replace “Challan” to “Receipt”**  
    Replace “Challan” to “Receipt” in whole software and from onward only “Receipt” word will be use for any kind of challans/Receipt/Invoice. 
2.  **Presentation of State and Province**  
    Province should be shown only for Pakistan and for all the other countries there should be State.
3.  **Eye Icon Hide/Unhide  
    **Every Password field should have hide and unhide icon in all of HIMS.
4.  **Date Format  
    **Date format for all of the HIMS should be showing in all the places of data table and on Reports will be like **Nov 08, 2023**.
5.  **Spacing of Data Table  
    **There should be 3 Character space in all the data table columns which has specific data such as Action Columns, Status, National ID, Phone Number, MR No. etc.
6.  **SQL database schema  
    **Every New Table should inherit with basemodel and there should be BranchId column foregin key in table
7.  **Null Handling**

Null Handling even value can not be null, should be there

|     |     |     |
| --- | --- | --- |
| **SOP’s Front End** | **✓** | **X** |
| All Buttons in “Action” Column of Data Table should be centrally Aligned. |     |     |
| All “Active/Inactive” heading in Data Table Columns should be Replaced with “Status”. |     |     |
| All Data in “Status” Column of Data Table should be centrally Aligned. |     |     |
| The Data in Columns of Data Table that contain “Symbols data” should be centrally Aligned in all direction (up / down, right / left). |     |     |
| The data in Columns of Data Table that contain “Numeric Data” should be centrally Aligned (up / down, right / left). |     |     |
| The Data in Columns of Data Table that contain “Text Data” should be Left Aligned. |     |     |
| All Data Table Columns should contain Ascending/Descending Sorting. |     |     |
| All Data Tables columns that contain CNIC and MR. No columns should allow searching for both CNIC and MR. No. |     |     |
| All Data Tables columns that contain Lab No, MR. No & CNIC columns should allow searching for both Lab No, MR. No& CNIC. |     |     |
| All pages Add New content should contain “Add” with module in Heading. |     |     |
| All pages Edit content should contain “Edit” with module in Heading. |     |     |
| All pages containing “Numeric Prices” should be separated by comas with 2 decimal points. |     |     |
| Modified On, Created On. |     |     |
| Modified by, Created by. |     |     |
| Time Stamp locking (Server side). |     |     |
| No changing in reports specially from administrator point of view and diff type of statuses of view link signature, date and time, name, dr, etc and clinical parameters not more than 1 month, except diagnostic, investigation, procedures, no change in report from 24Hrs onwards. |     |     |
| Font Size in Bold 12 and normal 11. |     |     |
| All columns containing Amount/Prices should be Right Align with 3 digits, (000,000,000.00) separated. |     |     |
| Selected Tabs in Header should be **BOLD and Highlighted, horizontal scroll if tab more than one page (all tabs should be in one line in horizontally).** |     |     |
| No or 0 data input fields/ columns etc. **Should Not** be showing in the Print. |     |     |
| Compatibility for all Browsers (Chrome, Microsoft Edge, Safari, Firefox). |     |     |
| Responsiveness of pages, (layout design). |     |     |
| New Edit/ Updated data in data table modified by ascending order. |     |     |
| Medicines layout/ priority should be the same as/ when order in eRX/ Pharmacy/ Challan/ anywhere showing as output, (same for the all ordered services). |     |     |
| Checking the movement of cursor on every page by using **TAB** button. |     |     |
| **Enter** button should be working on every **Search** field, **Submit** button and **Update** Button. |     |     |
| First element of the form should be **autofocused** on the page load and reload. |     |     |
| Verify all the button (Submit, Update, Edit etc.) by adding **$('#SubmitId').click()** this id multiple time in Inspect Element for double click checking. |     |     |