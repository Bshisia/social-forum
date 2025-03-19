class FilterNavComponent {
    constructor() {
        this.container = document.getElementById('filter-nav');
    }

    render() {
        return `
            <div class="categories-filter-container">
                <a href="/">All posts</a>
                <h3>Filter Posts by:</h3>
                <ul>
                    <li><a href="/created">Created Posts</a></li>
                    <li><a href="/liked">Reacted Posts</a></li>
                    <li><a href="/commented">Commented Posts</a></li>
                </ul>
                <h3>Categories</h3>
                <ul class="category-list">
                    <li><a href="/category?name=Tech">Tech</a></li>
                    <li><a href="/category?name=Programming">Programming</a></li>
                    <li><a href="/category?name=Business">Business</a></li>
                    <li><a href="/category?name=Lifestyle">Lifestyle</a></li>
                    <li><a href="/category?name=Football">Football</a></li>
                    <li><a href="/category?name=Politics">Politics</a></li>
                    <li><a href="/category?name=General%20News">General News</a></li>
                </ul>
            </div>`;
    }

    mount() {
        this.container.innerHTML = this.render();
    }
}
export default FilterNavComponent;