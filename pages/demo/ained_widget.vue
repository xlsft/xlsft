<template>
    <section>
        <div class="flex flex-col gap-[48px]">
            <h1>Квартира вашей мечты в самом сердце города</h1>
            <button onclick="window.ained.widget.show()">Доступные квартиры</button>
        </div>
    </section>
    <section class="flex-row flex justify-between">
        <div class="flex flex-col justify-center">
            <span class="text-4xl!">155</span>
            <span class="text-sm!">Уникальных квартир</span>
        </div>
        <div class="flex flex-col justify-center">
            <span class="text-4xl!">319</span>
            <span class="text-sm!">Парковочных мест</span>
        </div>
        <div class="flex flex-col justify-center">
            <span class="text-4xl!">1 365 м2</span>
            <span class="text-sm!">Жилой площади</span>
        </div>
    </section>
    <section id="ained-widget" class="p-0! h-[700px] max-h-[700px] *:outline-none overflow-hidden"></section>
</template>

<style>
    iframe {
        min-height: 764px;
    }
</style>