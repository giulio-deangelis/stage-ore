sap.ui.define([], () => {
    'use strict'
    
    $.extend(Date.prototype, {
        
        getLastDayOfMonth() {
            const year = this.getFullYear()
            const month = this.getMonth()
            return new Date(year, month + 1, 0).getDate()
        },
        
        getFortnight() {
            const day = this.getDate()
            const year = this.getFullYear()
            const month = this.getMonth()
            let firstDate, lastDate
            
            if (day > 16) {
                firstDate = new Date(year, month, 16)
                lastDate = new Date(year, month, this.getLastDayOfMonth())
            } else {
                firstDate = new Date(year, month, 1)
                lastDate = new Date(year, month, 16)
            }
            
            return {firstDate, lastDate}
        },
        
        getFortnightDays() {
            const {firstDate, lastDate} = this.getRelativeFortnight()
            const firstDay = firstDate.getDate()
            const lastDay = lastDate.getDate()
            return {firstDay, lastDay}
        }
    })
})