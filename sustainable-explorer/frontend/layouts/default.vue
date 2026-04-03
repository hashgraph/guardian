<template>
    <div class="flex min-h-screen">
        <AppSidebar />
        <div class="flex flex-1 flex-col overflow-auto">
            <AppTopbar />
            <main class="flex-1">
                <slot />
            </main>
        </div>
    </div>
</template>
